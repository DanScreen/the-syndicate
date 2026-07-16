/**
 * One-off prod data fixes. Always preview first (default); pass --execute to apply.
 *
 * Usage (from repo root, with DATABASE_URL pointing at target DB):
 *   npx tsx apps/web/scripts/data-maintenance.ts preview-solo-rounds --email you@example.com
 *   npx tsx apps/web/scripts/data-maintenance.ts remove-solo-rounds --email you@example.com --execute
 *   npx tsx apps/web/scripts/data-maintenance.ts preview-resettle --round-id <cuid>
 *   npx tsx apps/web/scripts/data-maintenance.ts resettle-round --round-id <cuid> --execute
 *   npx tsx apps/web/scripts/data-maintenance.ts find-rounds --teams Norway England
 *   npx tsx apps/web/scripts/data-maintenance.ts preview-duplicate-markets
 *   npx tsx apps/web/scripts/data-maintenance.ts fix-duplicate-markets --execute
 *   npx tsx apps/web/scripts/data-maintenance.ts reconcile-points --execute
 *   npx tsx apps/web/scripts/data-maintenance.ts rescore-member-legs --execute
 *   npx tsx apps/web/scripts/data-maintenance.ts resync-matches --execute
 */
import { prisma } from "@tiki-acca/database";
import { Prisma, type Leg, type Round } from "@prisma/client";
import {
  findRedundantMarketLegs,
  memberAccaLegPoints,
  type LegOutcome,
} from "@tiki-acca/shared";

import { deleteRedundantMarketLegs } from "../src/lib/legs/purge-duplicate-markets";
import { lockRoundWithAccaPricing } from "../src/lib/odds/lock-round";
import {
  calculateGroupProfitLoss,
  deriveCombinedOddsFromLegs,
  pointsForMemberLeg,
} from "../src/lib/settlement";
import { applyRoundSettlement } from "../src/lib/settlement/apply-round-settlement";
import { resolveRoundOutcomes } from "../src/lib/settlement/resolve-round-outcomes";
import { openRound } from "../src/lib/rounds/open-round";

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
    await openRound(groupId);
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
  outcomeMap: Map<string, import("@tiki-acca/shared").LegOutcome>
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

async function findRoundsWithDuplicateMarkets() {
  const rounds = await prisma.round.findMany({
    where: { legs: { some: {} } },
    include: {
      legs: { include: { user: { select: { email: true, name: true } } } },
      group: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return rounds
    .map((round) => ({
      round,
      conflicts: findRedundantMarketLegs(round.legs),
    }))
    .filter((row) => row.conflicts.length > 0);
}

async function previewDuplicateMarkets() {
  const rows = await findRoundsWithDuplicateMarkets();
  console.log(`Rounds with duplicate market families: ${rows.length}`);
  for (const { round, conflicts } of rows) {
    console.log(`  ${describeRound(round as RoundWithLegs)}`);
    for (const conflict of conflicts) {
      const kept = conflict.kept;
      console.log(
        `    keep ${kept.id}: ${kept.homeTeam} vs ${kept.awayTeam} · ${kept.marketLabel ?? kept.marketType} (${kept.selectionLabel ?? ""})`
      );
      for (const rem of conflict.removed) {
        console.log(
          `    remove ${rem.id}: ${rem.homeTeam} vs ${rem.awayTeam} · ${rem.marketLabel ?? rem.marketType} (${rem.selectionLabel ?? ""})`
        );
      }
    }
  }
  console.log(
    execute
      ? ""
      : "\nDry run only. Pass --execute with fix-duplicate-markets to apply."
  );
}

async function fixDuplicateMarkets() {
  const rows = await findRoundsWithDuplicateMarkets();
  if (rows.length === 0) {
    console.log("No duplicate market-family legs found.");
    return;
  }

  console.log(
    `${execute ? "Fixing" : "Would fix"} ${rows.length} round(s) with duplicate markets:`
  );

  for (const { round, conflicts } of rows) {
    const removeIds = conflicts.flatMap((c) => c.removed.map((l) => l.id));
    console.log(
      `  [${round.id}] ${round.status} group="${round.group.name}" remove ${removeIds.length} leg(s)`
    );
    if (!execute) continue;

    if (round.status === "open") {
      await deleteRedundantMarketLegs(round.id);
      continue;
    }

    if (round.status === "locked") {
      await deleteRedundantMarketLegs(round.id);
      const remaining = await prisma.leg.findMany({ where: { roundId: round.id } });
      if (remaining.length === 0) {
        await prisma.round.update({
          where: { id: round.id },
          data: {
            status: "open",
            combinedOdds: null,
            bestBookmakerId: null,
            accaBookmakerRankings: Prisma.DbNull,
          },
        });
        await prisma.group.update({
          where: { id: round.groupId },
          data: { status: "open" },
        });
      } else {
        await lockRoundWithAccaPricing(round.id, remaining);
      }
      continue;
    }

    if (round.status === "settled") {
      // Keep status=settled: reverse awarded points, drop redundant legs, re-award
      // from remaining outcomes (avoid flipping to locked while a newer open round exists).
      const outcomeById = new Map(
        round.legs.map((l) => [l.id, l.outcome as LegOutcome])
      );

      await prisma.$transaction(async (tx) => {
        await reverseSettledRound(tx, round);
      });

      await deleteRedundantMarketLegs(round.id);
      const remaining = await prisma.leg.findMany({ where: { roundId: round.id } });

      if (remaining.length === 0) {
        await prisma.round.update({
          where: { id: round.id },
          data: {
            combinedOdds: null,
            bestBookmakerId: null,
            profitLossGbp: 0,
            accaBookmakerRankings: Prisma.DbNull,
          },
        });
        console.log(`    emptied settled round ${round.id}`);
        continue;
      }

      const outcomes = remaining.map(
        (l) => outcomeById.get(l.id) ?? ("pending" as LegOutcome)
      );
      const combinedOdds = deriveCombinedOddsFromLegs(remaining);

      await prisma.$transaction(async (tx) => {
        for (const leg of remaining) {
          const outcome = outcomeById.get(leg.id) ?? ("pending" as LegOutcome);
          const points = pointsForMemberLeg(outcomes, outcome, leg.odds);

          await tx.leg.update({
            where: { id: leg.id },
            data: { outcome, pointsAwarded: points },
          });

          if (outcome === "pending") continue;

          await tx.groupMember.update({
            where: {
              groupId_userId: { groupId: round.groupId, userId: leg.userId },
            },
            data: {
              points: { increment: points },
              legsWon: outcome === "won" ? { increment: 1 } : undefined,
              legsLost: outcome === "lost" ? { increment: 1 } : undefined,
            },
          });

          await tx.user.update({
            where: { id: leg.userId },
            data: {
              totalPoints: { increment: points },
              legsWon: outcome === "won" ? { increment: 1 } : undefined,
              legsLost: outcome === "lost" ? { increment: 1 } : undefined,
            },
          });
        }

        await tx.round.update({
          where: { id: round.id },
          data: {
            combinedOdds,
            profitLossGbp: calculateGroupProfitLoss(
              outcomes,
              combinedOdds,
              round.stakeGbp
            ),
          },
        });
      });

      console.log(`    re-scored settled round ${round.id}`);
    }
  }

  if (!execute) {
    console.log("\nDry run only. Pass --execute to apply fix-duplicate-markets.");
    return;
  }

  await reconcilePoints(true);
  console.log("Done.");
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

/**
 * Recompute Leg.pointsAwarded from outcomes under the current scoring rule
 * (won pick → odds−1 even when the group acca lost), then reconcile totals.
 */
async function rescoreMemberLegs() {
  const rounds = await prisma.round.findMany({
    where: { status: "settled" },
    include: { legs: true, group: { select: { name: true } } },
    orderBy: { settledAt: "asc" },
  });

  const changes: string[] = [];

  for (const round of rounds) {
    const outcomes = round.legs.map((l) => l.outcome as LegOutcome);
    for (const leg of round.legs) {
      const expected = memberAccaLegPoints(
        outcomes,
        leg.outcome as LegOutcome,
        leg.odds
      );
      const current = Number(leg.pointsAwarded.toFixed(2));
      if (current === expected) continue;

      changes.push(
        `[${round.group.name}] ${round.id} leg ${leg.id}: ${current} → ${expected} (${leg.outcome} @ ${leg.odds})`
      );
      if (execute) {
        await prisma.leg.update({
          where: { id: leg.id },
          data: { pointsAwarded: expected },
        });
      }
    }
  }

  if (changes.length === 0) {
    console.log("All settled leg points already match the current scoring rule.");
    return;
  }

  console.log(
    `${execute ? "Updated" : "Would update"} ${changes.length} leg point(s):`
  );
  for (const line of changes) console.log(`  ${line}`);

  if (!execute) {
    console.log("\nDry run only. Pass --execute with rescore-member-legs to apply.");
    return;
  }

  await reconcilePoints(true);
  console.log("Rescored legs and reconciled user/member totals.");
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
    case "rescore-member-legs":
      await rescoreMemberLegs();
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
    case "preview-duplicate-markets":
      await previewDuplicateMarkets();
      break;
    case "fix-duplicate-markets":
      await fixDuplicateMarkets();
      break;
    default:
      console.error(`Unknown command: ${command ?? "(none)"}`);
      console.error(
        "Commands: preview-solo-rounds, remove-solo-rounds, find-rounds, preview-resettle, resettle-round, preview-duplicate-markets, fix-duplicate-markets, reconcile-points, rescore-member-legs, resync-matches"
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
