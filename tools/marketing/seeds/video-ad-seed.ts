/**
 * Video ad seed for "The Cage" (docs/VIDEO_AD_BRIEF.md §7). Builds two demo
 * groups — Tuesday Reds and Tuesday Blues — at a named stage of the story so
 * each betslip state can be screen-captured exactly as the app renders it.
 *
 * Cast, picks, odds and stages live in ../video-ad/scenario.json.
 * Every account uses the @demo.tikiacca.com domain, so admin platform
 * leaderboards already omit them (apps/web/src/lib/admin/demo-accounts.ts).
 *
 * Run from the repository root:
 *   npm run video-ad:seed -- --stage=red-3
 *   npm run video-ad:seed                      # "final": both rounds settled
 *   npm run video-ad:seed -- --list            # print stage names
 *
 * Idempotent: rebuilds the two scenario groups and upserts their eight users.
 * Never point DATABASE_URL at production.
 */
import { readFileSync } from "node:fs";
import { prisma } from "@tiki-acca/database";
import bcrypt from "bcryptjs";

type Outcome = "won" | "lost";
type Pick = {
  home: string;
  away: string;
  competitionId: string;
  competition: string;
  marketType: string;
  marketLabel: string;
  selectionLabel: string;
  odds: number;
  outcome: Outcome;
};
type Member = {
  key: string;
  role: string;
  firstName: string;
  lastName: string;
  dob: string;
  pick: Pick;
};
type GroupSpec = {
  key: string;
  name: string;
  inviteCode: string;
  team: string;
  members: Member[];
};
type RoundStatus = "open" | "locked" | "settled";
type Stage = {
  name: string;
  beat: string;
  group: string;
  submitted: number;
  status: RoundStatus;
  resolved: number;
  loginAs: string;
  view: string;
};
type Scenario = {
  password: string;
  bookmaker: { id: string; name: string };
  groups: GroupSpec[];
  stages: Stage[];
};

const SCENARIO_PATH = new URL("../video-ad/scenario.json", import.meta.url);
const scenario = JSON.parse(readFileSync(SCENARIO_PATH, "utf8")) as Scenario;

const hour = 60 * 60 * 1000;
const day = 24 * hour;
const now = Date.now();

/** Same rounding the app uses (`Number(x.toFixed(2))`). */
const to2 = (n: number) => Number(n.toFixed(2));

export const emailFor = (memberKey: string) => `cage.${memberKey}@demo.tikiacca.com`;

type GroupState = { submitted: number; status: RoundStatus; resolved: number };

function stateFor(group: GroupSpec, stage: Stage | null): GroupState {
  if (stage && stage.group === group.key) {
    return { submitted: stage.submitted, status: stage.status, resolved: stage.resolved };
  }
  const n = group.members.length;
  return { submitted: n, status: "settled", resolved: n };
}

function parseStage(argv: string[]): Stage | null | "list" {
  if (argv.includes("--list")) return "list";
  const inline = argv.find((a) => a.startsWith("--stage="));
  const flagIndex = argv.indexOf("--stage");
  const name = inline ? inline.slice("--stage=".length) : flagIndex >= 0 ? argv[flagIndex + 1] : "final";
  if (!name || name === "final") return null;
  const stage = scenario.stages.find((s) => s.name === name);
  if (!stage) {
    throw new Error(
      `Unknown stage "${name}". Valid: final, ${scenario.stages.map((s) => s.name).join(", ")}`
    );
  }
  return stage;
}

/** UK Saturday kickoffs (BST) by pass order: 12:30, 15:00, 17:30, 20:00. */
const SATURDAY_SLOTS_UTC: [number, number][] = [
  [11, 30],
  [14, 0],
  [16, 30],
  [19, 0],
];

function saturday(direction: 1 | -1): Date {
  const d = new Date(now + direction * day);
  while (d.getUTCDay() !== 6) d.setTime(d.getTime() + direction * day);
  return d;
}

/**
 * Kickoff for leg `i` at this state: next Saturday before results exist, last
 * Saturday once settled, and staggered through today while a locked acca is
 * in progress. Distinct kickoffs also fix the history card's leg order, which
 * sorts by kickoff.
 */
function kickoffFor(state: GroupState, i: number): Date {
  if (state.status === "locked" && state.resolved > 0) {
    return new Date(now - (4 - i) * 50 * 60 * 1000);
  }
  const d = saturday(state.status === "settled" ? -1 : 1);
  const [h, m] = SATURDAY_SLOTS_UTC[i % SATURDAY_SLOTS_UTC.length];
  d.setUTCHours(h, m, 0, 0);
  return d;
}

async function seedGroup(
  group: GroupSpec,
  state: GroupState,
  users: Record<string, { id: string }>
) {
  const created = await prisma.group.create({
    data: {
      name: group.name,
      inviteCode: group.inviteCode,
      sport: "football",
      maxMembers: 10,
      legsPerMember: 1,
      maxActiveBets: 1,
      status: "open",
      ownerId: users[group.members[0].key].id,
      members: {
        create: group.members.map((m, i) => ({
          userId: users[m.key].id,
          role: i === 0 ? "owner" : "member",
        })),
      },
    },
  });

  const kickoffs = group.members.map((_, i) => kickoffFor(state, i));
  const firstKickoff = kickoffs[0].getTime();
  const lastKickoff = kickoffs[kickoffs.length - 1].getTime();
  const submitted = group.members.slice(0, state.submitted);
  const combinedOdds = to2(submitted.reduce((acc, m) => acc * m.pick.odds, 1));
  const lockedOrLater = state.status !== "open";
  const settled = state.status === "settled";
  const accaWon = settled && submitted.every((m) => m.pick.outcome === "won");
  const { bookmaker } = scenario;

  const round = await prisma.round.create({
    data: {
      groupId: created.id,
      betNumber: 1,
      status: state.status,
      legsPerMember: 1,
      combinedOdds: lockedOrLater ? combinedOdds : null,
      bestBookmakerId: lockedOrLater ? bookmaker.id : null,
      accaBookmakerRankings: lockedOrLater
        ? [{ bookmakerId: bookmaker.id, bookmakerName: bookmaker.name, combinedOdds }]
        : undefined,
      stakeGbp: 10,
      profitLossGbp: settled ? (accaWon ? to2(10 * (combinedOdds - 1)) : -10) : null,
      lockedAt: lockedOrLater ? new Date(Math.min(now, firstKickoff) - hour) : null,
      settledAt: settled ? new Date(lastKickoff + 2 * hour) : null,
    },
  });

  const totals: Record<string, { points: number; won: number; lost: number }> = {};
  for (const [i, m] of submitted.entries()) {
    const resolved = i < state.resolved;
    const outcome = resolved ? m.pick.outcome : "pending";
    const points = !resolved ? 0 : outcome === "won" ? to2(m.pick.odds - 1) : -1;
    totals[m.key] = {
      points,
      won: outcome === "won" ? 1 : 0,
      lost: outcome === "lost" ? 1 : 0,
    };
    const p = m.pick;
    await prisma.leg.create({
      data: {
        roundId: round.id,
        userId: users[m.key].id,
        legIndex: 1,
        fixtureId: `${p.competitionId}:${p.home}:${p.away}`.toLowerCase().replace(/\s+/g, "-"),
        homeTeam: p.home,
        awayTeam: p.away,
        competitionId: p.competitionId,
        competition: p.competition,
        kickoff: kickoffs[i],
        marketType: p.marketType,
        marketLabel: p.marketLabel,
        selectionId: `${p.marketType}:${p.selectionLabel}`,
        selectionLabel: p.selectionLabel,
        odds: p.odds,
        bookmakerId: bookmaker.id,
        bookmakerName: bookmaker.name,
        outcome,
        pointsAwarded: points,
        // Submission times follow pass order. The active betslip query has no
        // leg orderBy, so capture-video-ad.mjs restores pass order on screen.
        createdAt: new Date(now - 3 * hour + i * 20 * 60 * 1000),
      },
    });
  }

  for (const m of group.members) {
    const t = totals[m.key] ?? { points: 0, won: 0, lost: 0 };
    await prisma.groupMember.update({
      where: { groupId_userId: { groupId: created.id, userId: users[m.key].id } },
      data: { points: t.points, legsWon: t.won, legsLost: t.lost },
    });
    await prisma.user.update({
      where: { id: users[m.key].id },
      data: { totalPoints: t.points, legsWon: t.won, legsLost: t.lost },
    });
  }

  return { group: created, combinedOdds };
}

async function main() {
  const parsed = parseStage(process.argv.slice(2));
  if (parsed === "list") {
    console.log(["final", ...scenario.stages.map((s) => `${s.name} (${s.beat})`)].join("\n"));
    return;
  }
  const stage = parsed;
  const members = scenario.groups.flatMap((g) => g.members);
  const passwordHash = await bcrypt.hash(scenario.password, 10);

  await prisma.group.deleteMany({
    where: { inviteCode: { in: scenario.groups.map((g) => g.inviteCode) } },
  });

  // Upsert rather than recreate: stable user IDs keep existing sign-in
  // sessions valid between stages, so the capture signs in once per member
  // (sign-in is rate limited to 10 per 5 minutes).
  const users: Record<string, { id: string }> = {};
  for (const m of members) {
    const profile = {
      firstName: m.firstName,
      lastName: m.lastName,
      name: `${m.firstName} ${m.lastName}`,
      dateOfBirth: new Date(m.dob),
      passwordHash,
      role: "user",
      emailVerifiedAt: new Date(),
    };
    users[m.key] = await prisma.user.upsert({
      where: { email: emailFor(m.key) },
      update: profile,
      create: { ...profile, email: emailFor(m.key) },
    });
  }

  console.log(`Video ad seed: stage "${stage?.name ?? "final"}"${stage ? ` (${stage.beat})` : ""}`);
  for (const group of scenario.groups) {
    const state = stateFor(group, stage);
    const { combinedOdds } = await seedGroup(group, state, users);
    console.log(
      `  ${group.name}: ${state.status}, ${state.submitted} leg(s), ${state.resolved} resolved, combined ${combinedOdds.toFixed(2)}`
    );
  }
  console.log(`  Login: ${emailFor(stage?.loginAs ?? members[0].key)} / ${scenario.password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
