/**
 * One-off remediation: add a leg to a locked round when the leg IS on the
 * physical bookmaker slip but never made it into the database.
 *
 * Use ONLY when the placed bet genuinely contains the leg and the member has
 * given permission. This deliberately bypasses the kickoff cutoff in
 * `lib/rounds/first-kickoff.ts`, so it must never be used to add a selection
 * that was not actually struck with the bookmaker before kickoff.
 *
 * Dry run by default. Pass --apply to commit.
 *
 * Bookmaker defaults to the one the rest of the acca was priced with. The new
 * acca price defaults to the locked price x the new leg's odds; pass
 * --slip-odds to override with the figure printed on the physical slip.
 *
 * PREREQUISITES (not permanent — re-add each time):
 *   1. cloud-sql-proxy running against the prod instance.
 *   2. If driving this through Claude Code, these rules in
 *      .claude/settings.local.json, which are removed again after use:
 *        "Bash(cloud-sql-proxy:*)",
 *        "Bash(gcloud secrets versions access latest --secret=DATABASE_URL:*)"
 *
 * See docs/DEPLOYMENT.md "Backfill a leg missing from a locked round".
 *
 *   DATABASE_URL=... npx tsx scripts/backfill-missing-leg.ts --local-proxy \
 *     --invite-code NBMXERFG \
 *     --email tdonnelly453@gmail.com \
 *     --home "Stoke City" --away "Swansea City" \
 *     --kickoff 2026-08-15T14:00:00Z \
 *     --leg-odds 1.72 \
 *     --set-last-name Donnelly
 */
import type { PrismaClient } from "@prisma/client";
import { COMPETITIONS } from "@tiki-acca/shared";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

/**
 * The prod DATABASE_URL targets Cloud Run's Unix socket
 * (`?host=/cloudsql/<instance>`). Running locally through cloud-sql-proxy needs
 * TCP instead. Rewrite before importing the client, which binds the URL on
 * instantiation.
 */
function rewriteForLocalProxy(): void {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set");
  const port = arg("proxy-port") ?? "5432";
  const u = new URL(raw);
  u.searchParams.delete("host");
  u.hostname = "127.0.0.1";
  u.port = port;
  process.env.DATABASE_URL = u.toString();
  console.log(`Connecting via local proxy at 127.0.0.1:${port} (db ${u.pathname.slice(1)})`);
}

function required(name: string): string {
  const v = arg(name);
  if (!v) throw new Error(`Missing required --${name}`);
  return v;
}

const APPLY = process.argv.includes("--apply");

let prisma: PrismaClient;

async function main() {
  if (process.argv.includes("--local-proxy")) rewriteForLocalProxy();
  ({ prisma } = (await import("@tiki-acca/database")) as { prisma: PrismaClient });

  const inviteCode = required("invite-code");
  const email = required("email").toLowerCase();
  const homeTeam = required("home");
  const awayTeam = required("away");
  const kickoff = new Date(required("kickoff"));
  const legOdds = Number(required("leg-odds"));
  const competitionId = arg("competition") ?? "championship";
  const marketType = arg("market-type") ?? "both_teams_score";
  const marketLabel = arg("market-label") ?? "Both Teams to Score";
  const selectionId = arg("selection") ?? "yes";
  const selectionLabel = arg("selection-label") ?? "Yes";
  /** Combined odds printed on the physical slip. Authoritative if the two disagree. */
  const slipOdds = arg("slip-odds") ? Number(arg("slip-odds")) : undefined;
  /** Surname to backfill on an account that was created without one. */
  const setLastName = arg("set-last-name");

  if (!Number.isFinite(legOdds) || legOdds <= 1) {
    throw new Error(`--leg-odds must be decimal odds > 1, got ${legOdds}`);
  }
  if (Number.isNaN(kickoff.getTime())) throw new Error("--kickoff is not a valid date");

  const competition = COMPETITIONS.find((c) => c.id === competitionId);
  if (!competition) throw new Error(`Unknown competition id: ${competitionId}`);

  const group = await prisma.group.findUnique({
    where: { inviteCode },
    include: { members: true },
  });
  if (!group) throw new Error(`No group with invite code ${inviteCode}`);

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (!user) {
    throw new Error(
      `No user with email ${email}. They must complete sign-up first — ` +
        `this script will not fabricate an account.`
    );
  }

  const betNumber = arg("bet-number");
  const rounds = await prisma.round.findMany({
    where: {
      groupId: group.id,
      status: "locked",
      ...(betNumber ? { betNumber: Number(betNumber) } : {}),
    },
    include: { legs: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  if (rounds.length === 0) throw new Error("No locked round found for this group");
  if (rounds.length > 1) {
    throw new Error(
      `${rounds.length} locked rounds found — disambiguate with --bet-number ` +
        `(${rounds.map((r) => r.betNumber).join(", ")})`
    );
  }
  const round = rounds[0]!;

  if (round.settledAt) throw new Error("Round is already settled — do not rewrite settled history");
  if (round.legs.some((l) => l.userId === user.id)) {
    throw new Error(`${user.email} already has a leg in bet #${round.betNumber} — nothing to do`);
  }

  // Default to the bookmaker the rest of the acca was priced with — a single
  // slip is struck at one bookmaker, so a mixed round means something is off.
  const distinctBookmakers = [...new Set(round.legs.map((l) => l.bookmakerId))];
  if (!arg("bookmaker") && distinctBookmakers.length !== 1) {
    throw new Error(
      `Existing legs span ${distinctBookmakers.length} bookmakers ` +
        `(${distinctBookmakers.join(", ")}) — name it explicitly with --bookmaker/--bookmaker-name`
    );
  }
  const bookmakerId = arg("bookmaker") ?? distinctBookmakers[0]!;
  const bookmakerName =
    arg("bookmaker-name") ??
    round.legs.find((l) => l.bookmakerId === bookmakerId)?.bookmakerName ??
    bookmakerId;

  // Link the Match row if we have one, so auto-settlement can resolve BTTS from
  // the score rather than needing a manual admin outcome.
  const match = await prisma.match.findFirst({
    where: {
      competitionId,
      homeTeam: { contains: homeTeam.split(" ")[0]!, mode: "insensitive" },
      awayTeam: { contains: awayTeam.split(" ")[0]!, mode: "insensitive" },
      kickoff: {
        gte: new Date(kickoff.getTime() - 6 * 60 * 60 * 1000),
        lte: new Date(kickoff.getTime() + 6 * 60 * 60 * 1000),
      },
    },
  });

  // The locked price is what the slip was actually struck at, so extend that
  // rather than recomputing from legs — the product can drift from the stored
  // value through per-leg rounding at lock time.
  if (round.combinedOdds === null) {
    throw new Error("Round has no combinedOdds — cannot extend a price that was never snapshotted");
  }
  const extendedFromLocked = Number((round.combinedOdds * legOdds).toFixed(2));
  const productOfLegs = [...round.legs.map((l) => l.odds), legOdds].reduce((a, b) => a * b, 1);
  const newCombined = slipOdds ?? extendedFromLocked;

  console.log(`\nGroup     : ${group.name} (${inviteCode})`);
  console.log(`Bet       : #${round.betNumber}  status=${round.status}  locked ${round.lockedAt?.toISOString()}`);
  console.log(`Member    : ${user.name ?? "(no name)"} <${user.email}>`);
  console.log(`  in group: ${group.members.some((m) => m.userId === user.id) ? "yes" : "NO — will be added"}`);
  console.log(`\nExisting legs (${round.legs.length}):`);
  for (const l of round.legs) {
    console.log(`  ${l.legIndex}. ${l.homeTeam} v ${l.awayTeam} — ${l.selectionLabel} @ ${l.odds}`);
  }
  console.log(`\nLeg to add:`);
  console.log(`  ${homeTeam} v ${awayTeam} — ${marketLabel}: ${selectionLabel} @ ${legOdds}`);
  console.log(`  ${competition.name}, kickoff ${kickoff.toISOString()}, ${bookmakerName}`);
  console.log(`  match row : ${match ? `${match.id} (auto-settle enabled)` : "NOT FOUND — leg will need manual settlement"}`);
  if (setLastName) {
    const newDisplay = `${user.firstName} ${setLastName}`.trim();
    console.log(`\nName      : "${user.name}" -> "${newDisplay}"  (lastName "${user.lastName}" -> "${setLastName}")`);
    if (user.lastName.trim() !== "") {
      console.log(`  WARNING: account already has a surname — this will overwrite it.`);
    }
  }

  console.log(`\nCombined odds: ${round.combinedOdds} -> ${newCombined}`);
  console.log(`  locked price x leg = ${round.combinedOdds} x ${legOdds} = ${extendedFromLocked}`);
  console.log(`  product of all legs = ${productOfLegs.toFixed(4)} (cross-check)`);
  if (slipOdds !== undefined) {
    const drift = Math.abs(slipOdds - extendedFromLocked) / extendedFromLocked;
    console.log(`  slip price          = ${slipOdds} (${(drift * 100).toFixed(2)}% from locked x leg)`);
    if (drift > 0.05) {
      console.log(`  WARNING: slip price differs from locked x leg by >5%.`);
      console.log(`  Check --leg-odds matches the price on the slip before applying.`);
    }
  }
  console.log(`\nPayout at stake £${round.stakeGbp}: £${(round.stakeGbp * newCombined).toFixed(2)} if it lands\n`);

  if (!APPLY) {
    console.log("DRY RUN — nothing written. Re-run with --apply to commit.\n");
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (setLastName) {
      // `name` is the derived display field used on leaderboards and in emails,
      // so it has to move with lastName or the two drift apart.
      await tx.user.update({
        where: { id: user.id },
        data: { lastName: setLastName, name: `${user.firstName} ${setLastName}`.trim() },
      });
    }

    await tx.groupMember.upsert({
      where: { groupId_userId: { groupId: group.id, userId: user.id } },
      create: { groupId: group.id, userId: user.id, role: "member" },
      update: {},
    });

    const legIndex =
      Math.max(0, ...round.legs.filter((l) => l.userId === user.id).map((l) => l.legIndex)) + 1;

    await tx.leg.create({
      data: {
        roundId: round.id,
        userId: user.id,
        legIndex,
        fixtureId: arg("fixture-id") ?? `manual-${round.id}-${user.id}`,
        homeTeam,
        awayTeam,
        competitionId,
        competition: competition.name,
        matchId: match?.id ?? null,
        kickoff,
        marketType,
        marketLabel,
        selectionId,
        selectionLabel,
        odds: legOdds,
        bookmakerId,
        bookmakerName,
      },
    });

    await tx.round.update({
      where: { id: round.id },
      data: { combinedOdds: newCombined },
    });
  });

  console.log("Applied. Verify the group page shows the leg and the new acca price.\n");
}

main()
  .catch((e) => {
    console.error(`\nAborted: ${e.message}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma?.$disconnect());
