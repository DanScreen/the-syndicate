/**
 * One-off prod data fixes. Always preview first (default); pass --execute to apply.
 *
 * Usage (from repo root, with DATABASE_URL pointing at target DB):
 *   npx tsx apps/web/scripts/data-maintenance.ts preview-solo-rounds --email you@example.com
 *   npx tsx apps/web/scripts/data-maintenance.ts remove-solo-rounds --email you@example.com --execute
 *   npx tsx apps/web/scripts/data-maintenance.ts preview-resettle --round-id <cuid>
 *   npx tsx apps/web/scripts/data-maintenance.ts resettle-round --round-id <cuid> --execute
 *   npx tsx apps/web/scripts/data-maintenance.ts find-rounds --teams Norway England
 *   npx tsx apps/web/scripts/data-maintenance.ts reconcile-points --execute
 *   npx tsx apps/web/scripts/data-maintenance.ts resync-matches --execute
 */
import { prisma } from "@the-syndicate/database";
import type { Leg, Prisma, Round } from "@prisma/client";
import { applyRoundSettlement } from "../src/lib/settlement/apply-round-settlement";
import { resolveRoundOutcomes } from "../src/lib/settlement/resolve-round-outcomes";
import { openCollectingRound } from "../src/lib/rounds/open-collecting-round";

type RoundWithLegs = Round & {
  legs: (Leg & { user: { email: string; name: string } })[];
  group: { name: string };
};

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const execute = process.argv.includes("--execute");
const command = process.argv[2];

async function reverseSettledRound(
  tx: Prisma.TransactionClient,
  round: Round & { legs: Leg[] }
) {
  if (round.status !== "settled") return;

  for (const leg of round.legs) {
    const data: Prisma.UserUpdateInput = {
      totalPoints: { decrement: leg.pointsAwarded },
    };
    if (leg.outcome === "won") data.legsWon = { decrement: 1 };
    if (leg.outcome === "lost") data.legsLost = { decrement: 1 };

    await tx.user.update({ where: { id: leg.userId }, data });

    const memberData: Prisma.GroupMemberUpdateInput = {
      points: { decrement: leg.pointsAwarded },
    };
    if (leg.outcome === "won") memberData.legsWon = { decrement: 1 };
    if (leg.outcome === "lost") memberData.legsLost = { decrement: 1 };

    await tx.groupMember.update({
      where: { groupId_userId: { groupId: round.groupId, userId: leg.userId } },
      data: memberData,
    });
  }
}

async function findSoloRounds(email: string): Promise<RoundWithLegs[]> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No user with email ${email}`);

  const rounds = await prisma.round.findMany({
    where: {
      legs: { some: {} },
      NOT: { legs: { some: { userId: { not: user.id } } } },
    },
    include: {
      legs: { include: { user: { select: { email: true, name: true } } } },
      group: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return rounds;
}

function describeRound(round: RoundWithLegs): string {
  const legs = round.legs
    .map(
      (l) =>
        `${l.homeTeam} vs ${l.awayTeam} (${l.selectionLabel} @ ${l.odds}, ${l.outcome}, ${l.pointsAwarded} pts)`
    )
    .join("; ");
  return `[${round.id}] group="${round.group.name}" status=${round.status} legs=${round.legs.length} — ${legs}`;
}

async function previewSoloRounds(email: string) {
  const rounds = await findSoloRounds(email);
  console.log(`Solo rounds for ${email}: ${rounds.length}`);
  let pointsToRestore = 0;
  for (const round of rounds) {
    console.log(`  ${describeRound(round)}`);
    if (round.status === "settled") {
      pointsToRestore += round.legs.reduce((s, l) => s + l.pointsAwarded, 0);
    }
  }
  console.log(
    `\nSettled solo rounds would restore ${pointsToRestore.toFixed(2)} pts to ${email} (and group member totals).`
  );
  console.log(execute ? "" : "Pass --execute with remove-solo-rounds to apply.");
}

async function removeSoloRounds(email: string) {
  const rounds = await findSoloRounds(email);
  if (rounds.length === 0) {
    console.log("Nothing to remove.");
    return;
  }

  console.log(`${execute ? "Removing" : "Would remove"} ${rounds.length} solo round(s):`);
  for (const round of rounds) console.log(`  ${describeRound(round)}`);

  if (!execute) {
    console.log("\nDry run only. Pass --execute to delete these rounds.");
    return;
  }

  const groupIds = new Set<string>();

  for (const round of rounds) {
    groupIds.add(round.groupId);
    await prisma.$transaction(async (tx) => {
      await reverseSettledRound(tx, round);
      await tx.round.delete({ where: { id: round.id } });
    });
    console.log(`Deleted ${round.id}`);
  }

  for (const groupId of groupIds) {
    await openCollectingRound(groupId);
  }

  await reconcilePoints(true);
  console.log("Done.");
}

async function findRoundsByTeams(teamA: string, teamB: string) {
  const rounds = await prisma.round.findMany({
    where: {
      legs: {
        some: {
          OR: [
            {
              AND: [
                { homeTeam: { contains: teamA, mode: "insensitive" } },
                { awayTeam: { contains: teamB, mode: "insensitive" } },
              ],
            },
            {
              AND: [
                { homeTeam: { contains: teamB, mode: "insensitive" } },
                { awayTeam: { contains: teamA, mode: "insensitive" } },
              ],
            },
          ],
        },
      },
    },
    include: {
      legs: { include: { user: { select: { email: true, name: true } } } },
      group: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`Rounds with ${teamA} vs ${teamB}: ${rounds.length}`);
  for (const round of rounds) console.log(`  ${describeRound(round)}`);
}

async function previewResettle(roundId: string) {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: {
      legs: { include: { user: { select: { email: true, name: true } } } },
      group: { select: { name: true } },
    },
  });

  if (!round) throw new Error(`Round ${roundId} not found`);
  if (round.status !== "settled") {
    console.log(`Round status is "${round.status}" — resettle only applies to settled rounds.`);
    console.log("For locked rounds, run match sync / auto-settle after deploying the orientation fix.");
    return;
  }

  console.log(describeRound(round as RoundWithLegs));

  const resolved = await resolveRoundOutcomes(round.legs);
  if (!resolved.ready) {
    console.log("Cannot resolve all legs yet:");
    for (const p of resolved.pending) console.log(`  ${p.legId}: ${p.reason}`);
    return;
  }

  let changes = 0;
  for (const leg of round.legs) {
    const next = resolved.outcomeMap.get(leg.id);
    if (next && next !== leg.outcome) {
      changes++;
      console.log(
        `  ${leg.user.email}: ${leg.homeTeam} vs ${leg.awayTeam} ${leg.selectionLabel} — ${leg.outcome} → ${next}`
      );
    }
  }

  if (changes === 0) {
    console.log("No outcome changes with current match data.");
    return;
  }

  console.log(
    `\n${changes} leg(s) would change. ${execute ? "Re-settling…" : "Pass --execute with resettle-round to apply."}`
  );

  if (execute) await resettleRound(roundId, round.legs, resolved.outcomeMap);
}

async function resettleRound(
  roundId: string,
  legs: Leg[],
  outcomeMap: Map<string, import("@the-syndicate/shared").LegOutcome>
) {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { legs: true },
  });
  if (!round || round.status !== "settled") throw new Error("Round must be settled");

  await prisma.$transaction(async (tx) => {
    await reverseSettledRound(tx, round);
    await tx.round.update({
      where: { id: roundId },
      data: { status: "locked", settledAt: null, profitLossGbp: null },
    });
    for (const leg of round.legs) {
      await tx.leg.update({
        where: { id: leg.id },
        data: { outcome: "pending", pointsAwarded: 0 },
      });
    }
  });

  const result = await applyRoundSettlement(roundId, outcomeMap);
  console.log(`Re-settled round ${roundId}; profitLossGbp=${result.profitLossGbp}`);
  await reconcilePoints(true);
}

async function reconcilePoints(silent = false) {
  const users = await prisma.user.findMany({ select: { id: true, email: true, totalPoints: true } });
  const members = await prisma.groupMember.findMany({
    select: { groupId: true, userId: true, points: true, user: { select: { email: true } } },
  });

  const fixes: string[] = [];

  for (const user of users) {
    const agg = await prisma.leg.aggregate({
      where: { userId: user.id, round: { status: "settled" } },
      _sum: { pointsAwarded: true },
    });
    const expected = Number((agg._sum.pointsAwarded ?? 0).toFixed(2));
    const current = Number(user.totalPoints.toFixed(2));
    if (current !== expected) {
      fixes.push(`User ${user.email}: ${current} → ${expected}`);
      if (execute) {
        await prisma.user.update({
          where: { id: user.id },
          data: { totalPoints: expected },
        });
      }
    }
  }

  for (const member of members) {
    const agg = await prisma.leg.aggregate({
      where: {
        userId: member.userId,
        round: { status: "settled", groupId: member.groupId },
      },
      _sum: { pointsAwarded: true },
    });
    const expected = Number((agg._sum.pointsAwarded ?? 0).toFixed(2));
    const current = Number(member.points.toFixed(2));
    if (current !== expected) {
      fixes.push(
        `Member ${member.user.email} in group ${member.groupId}: ${current} → ${expected}`
      );
      if (execute) {
        await prisma.groupMember.update({
          where: { groupId_userId: { groupId: member.groupId, userId: member.userId } },
          data: { points: expected },
        });
      }
    }
  }

  if (fixes.length === 0) {
    if (!silent) console.log("Points totals already match settled legs.");
    return;
  }

  console.log(`${execute ? "Fixed" : "Would fix"} ${fixes.length} total(s):`);
  for (const line of fixes) console.log(`  ${line}`);
  if (!execute) console.log("\nPass --execute to apply reconcile-points.");
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  switch (command) {
    case "preview-solo-rounds": {
      const email = argValue("--email");
      if (!email) throw new Error("--email required");
      await previewSoloRounds(email);
      break;
    }
    case "remove-solo-rounds": {
      const email = argValue("--email");
      if (!email) throw new Error("--email required");
      await removeSoloRounds(email);
      break;
    }
    case "find-rounds": {
      const teams = process.argv.slice(3).filter((a) => !a.startsWith("--"));
      if (teams.length < 2) throw new Error("Usage: find-rounds <teamA> <teamB>");
      await findRoundsByTeams(teams[0], teams[1]);
      break;
    }
    case "preview-resettle":
    case "resettle-round": {
      const roundId = argValue("--round-id");
      if (!roundId) throw new Error("--round-id required");
      await previewResettle(roundId);
      break;
    }
    case "reconcile-points":
      await reconcilePoints();
      break;
    case "resync-matches": {
      if (!execute) {
        console.log("Dry run only. Pass --execute to refresh Match rows from football-data.org.");
        break;
      }
      const { syncAllCompetitionMatches } = await import("../src/lib/results/sync-matches");
      const result = await syncAllCompetitionMatches();
      console.log(
        `Synced: ${result.totalCreated} created, ${result.totalUpdated} updated, ${result.totalSkipped} skipped`
      );
      break;
    }
    default:
      console.error(`Unknown command: ${command ?? "(none)"}`);
      console.error(
        "Commands: preview-solo-rounds, remove-solo-rounds, find-rounds, preview-resettle, resettle-round, reconcile-points, resync-matches"
      );
      process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
