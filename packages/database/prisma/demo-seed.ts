/**
 * Demo seed for marketing screenshots. Creates a presentable group with a
 * settled acca (history + leaderboard) and a current locked acca (hero shot).
 * Login: danny@demo.tikiacca.com / DemoPass123!
 *
 * Run: npx tsx prisma/demo-seed.ts   (from packages/database)
 */
import { prisma } from "../src";
import bcrypt from "bcryptjs";

const INVITE_CODE = "DEMO24";
const PASSWORD = "DemoPass123!";

const day = 24 * 60 * 60 * 1000;
const now = Date.now();

type DemoUser = {
  key: string;
  firstName: string;
  lastName: string;
  email: string;
  dob: string;
};

const USERS: DemoUser[] = [
  { key: "danny", firstName: "Danny", lastName: "Walsh", email: "danny@demo.tikiacca.com", dob: "1994-03-11" },
  { key: "sarah", firstName: "Sarah", lastName: "Okafor", email: "sarah@demo.tikiacca.com", dob: "1996-07-22" },
  { key: "marcus", firstName: "Marcus", lastName: "Bright", email: "marcus@demo.tikiacca.com", dob: "1992-11-02" },
  { key: "priya", firstName: "Priya", lastName: "Sharma", email: "priya@demo.tikiacca.com", dob: "1997-01-30" },
  { key: "tom", firstName: "Tom", lastName: "Reid", email: "tom@demo.tikiacca.com", dob: "1993-09-14" },
];

const round = (n: number) => Math.round(n * 100) / 100;

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // Clean any prior demo group + users so this is idempotent.
  const existing = await prisma.group.findUnique({ where: { inviteCode: INVITE_CODE } });
  if (existing) await prisma.group.delete({ where: { id: existing.id } });
  await prisma.user.deleteMany({ where: { email: { in: USERS.map((u) => u.email) } } });

  const users: Record<string, { id: string }> = {};
  for (const u of USERS) {
    const created = await prisma.user.create({
      data: {
        firstName: u.firstName,
        lastName: u.lastName,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        dateOfBirth: new Date(u.dob),
        passwordHash,
        role: "user",
      },
    });
    users[u.key] = created;
  }

  const group = await prisma.group.create({
    data: {
      name: "The Thursday Club",
      inviteCode: INVITE_CODE,
      sport: "football",
      maxMembers: 10,
      legsPerMember: 1,
      maxActiveBets: 1,
      status: "open",
      ownerId: users.danny.id,
      members: {
        create: USERS.map((u, i) => ({
          userId: users[u.key].id,
          role: i === 0 ? "owner" : "member",
        })),
      },
    },
  });

  const bookmaker = { id: "bet365", name: "Bet365" };
  const betslip = "https://www.bet365.com/";
  const memberTotals = Object.fromEntries(
    USERS.map((user) => [user.key, { points: 0, won: 0, lost: 0 }])
  ) as Record<string, { points: number; won: number; lost: number }>;

  // ---- Settled rounds (bets #1–6) — enough history for useful charts ----
  const settledRounds = [
    {
      won: true,
      legs: [
        ["danny", 1.5, "won"], ["sarah", 1.66, "won"], ["marcus", 1.8, "won"],
        ["priya", 1.3, "won"], ["tom", 1.22, "won"],
      ],
    },
    {
      won: false,
      legs: [
        ["danny", 1.72, "lost"], ["sarah", 1.85, "won"], ["marcus", 1.62, "won"],
        ["priya", 1.55, "lost"], ["tom", 1.4, "won"],
      ],
    },
    {
      won: true,
      legs: [
        ["danny", 1.8, "won"], ["sarah", 1.92, "won"], ["marcus", 1.7, "won"],
        ["priya", 1.48, "won"], ["tom", 1.36, "won"],
      ],
    },
    {
      won: false,
      legs: [
        ["danny", 2.0, "won"], ["sarah", 1.74, "lost"], ["marcus", 2.05, "lost"],
        ["priya", 1.67, "won"], ["tom", 1.5, "lost"],
      ],
    },
    {
      won: true,
      legs: [
        ["danny", 1.9, "won"], ["sarah", 1.7, "won"], ["marcus", 1.9, "won"],
        ["priya", 1.42, "won"], ["tom", 1.33, "won"],
      ],
    },
    {
      won: true,
      legs: [
        ["danny", 2.1, "won"], ["sarah", 1.78, "won"], ["marcus", 2.1, "won"],
        ["priya", 1.5, "won"], ["tom", 1.45, "won"],
      ],
    },
  ] as const;
  const fixtures = [
    ["Arsenal", "Brighton", "Match Result", "Arsenal"],
    ["Newcastle", "Fulham", "Both Teams to Score", "Yes"],
    ["Aston Villa", "Wolves", "Over/Under 2.5 Goals", "Over 2.5"],
    ["Man City", "Bournemouth", "Match Result", "Man City"],
    ["Liverpool", "Crystal Palace", "Double Chance", "Liverpool or Draw"],
  ] as const;

  for (const [roundIndex, spec] of settledRounds.entries()) {
    const betNumber = roundIndex + 1;
    const combinedOdds = round(spec.legs.reduce((total, leg) => total * leg[1], 1));
    const settled = await prisma.round.create({
      data: {
        groupId: group.id,
        betNumber,
        status: "settled",
        legsPerMember: 1,
        combinedOdds,
        bestBookmakerId: bookmaker.id,
        stakeGbp: 10,
        profitLossGbp: spec.won ? round(10 * (combinedOdds - 1)) : -10,
        lockedAt: new Date(now - (20 - roundIndex * 3) * day),
        settledAt: new Date(now - (19 - roundIndex * 3) * day),
      },
    });

    for (const [memberIndex, [key, odds, outcome]] of spec.legs.entries()) {
      const [home, away, marketLabel, selectionLabel] = fixtures[memberIndex];
      const marketType = marketLabel.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      const points = outcome === "won" ? round(odds - 1) : -1;
      memberTotals[key].points = round(memberTotals[key].points + points);
      memberTotals[key][outcome] += 1;
      await prisma.leg.create({
        data: {
          roundId: settled.id,
          userId: users[key].id,
          legIndex: 1,
          fixtureId: `demo:${betNumber}:${key}`,
          homeTeam: home,
          awayTeam: away,
          competitionId: "epl",
          competition: "Premier League",
          kickoff: new Date(now - (19 - roundIndex * 3) * day),
          marketType,
          marketLabel,
          selectionId: `${marketType}:${selectionLabel}`,
          selectionLabel,
          odds,
          bookmakerId: bookmaker.id,
          bookmakerName: bookmaker.name,
          betslipUrl: betslip,
          outcome,
          pointsAwarded: points,
        },
      });
    }
  }

  // ---- Current locked round (bet #7) — the hero shot ----
  const liveLegs = [
    { key: "danny", home: "Man City", away: "Brentford", comp: "epl", market: "match_winner", mLabel: "Match Result", sel: "Man City", odds: 1.4 },
    { key: "sarah", home: "Arsenal", away: "Tottenham", comp: "epl", market: "both_teams_score", mLabel: "Both Teams to Score", sel: "Yes", odds: 1.72 },
    { key: "marcus", home: "Liverpool", away: "Newcastle", comp: "epl", market: "over_under_25", mLabel: "Over/Under 2.5 Goals", sel: "Over 2.5", odds: 1.65 },
    { key: "priya", home: "Chelsea", away: "Everton", comp: "epl", market: "match_winner", mLabel: "Match Result", sel: "Chelsea", odds: 1.55 },
    { key: "tom", home: "Man Utd", away: "Aston Villa", comp: "epl", market: "double_chance", mLabel: "Double Chance", sel: "Man Utd or Draw", odds: 1.45 },
  ];
  const liveCombined = round(liveLegs.reduce((acc, l) => acc * l.odds, 1));

  const locked = await prisma.round.create({
    data: {
      groupId: group.id,
      betNumber: 7,
      status: "locked",
      legsPerMember: 1,
      combinedOdds: liveCombined,
      bestBookmakerId: bookmaker.id,
      accaBookmakerRankings: [
        { bookmakerId: "bet365", bookmakerName: "Bet365", combinedOdds: liveCombined },
        { bookmakerId: "williamhill", bookmakerName: "William Hill", combinedOdds: round(liveCombined * 0.98) },
        { bookmakerId: "paddypower", bookmakerName: "Paddy Power", combinedOdds: round(liveCombined * 0.96) },
        { bookmakerId: "skybet", bookmakerName: "Sky Bet", combinedOdds: round(liveCombined * 0.94) },
        { bookmakerId: "ladbrokes_uk", bookmakerName: "Ladbrokes", combinedOdds: round(liveCombined * 0.92) },
        { bookmakerId: "coral", bookmakerName: "Coral", combinedOdds: round(liveCombined * 0.9) },
      ],
      stakeGbp: 10,
      lockedAt: new Date(now - 2 * 60 * 60 * 1000),
    },
  });
  for (const l of liveLegs) {
    await prisma.leg.create({
      data: {
        roundId: locked.id,
        userId: users[l.key].id,
        legIndex: 1,
        fixtureId: `${l.comp}:${l.home}:${l.away}`.toLowerCase().replace(/\s+/g, "-"),
        homeTeam: l.home,
        awayTeam: l.away,
        competitionId: l.comp,
        competition: "Premier League",
        kickoff: new Date(now + 2 * day),
        marketType: l.market,
        marketLabel: l.mLabel,
        selectionId: `${l.market}:${l.sel}`,
        selectionLabel: l.sel,
        odds: l.odds,
        bookmakerId: bookmaker.id,
        bookmakerName: bookmaker.name,
        betslipUrl: betslip,
        outcome: "pending",
      },
    });
  }

  // ---- Stored leaderboard aggregates ----
  for (const u of USERS) {
    const totals = memberTotals[u.key];
    await prisma.groupMember.update({
      where: { groupId_userId: { groupId: group.id, userId: users[u.key].id } },
      data: { points: totals.points, legsWon: totals.won, legsLost: totals.lost },
    });
    await prisma.user.update({
      where: { id: users[u.key].id },
      data: { totalPoints: totals.points, legsWon: totals.won, legsLost: totals.lost },
    });
  }

  // ---- Group chat banter on the locked round (for the chat screenshot) ----
  const chat: { key: string; body: string; minsAgo: number }[] = [
    { key: "marcus", body: "Right, legs in by Friday night or you're carrying the drinks tab.", minsAgo: 120 },
    { key: "priya", body: "Chelsea to beat Everton. Confident enough to put my name on it.", minsAgo: 96 },
    { key: "tom", body: "Man Utd double chance because I've been let down enough times.", minsAgo: 74 },
    { key: "danny", body: "City to win obviously. Carrying this acca as usual 😏", minsAgo: 55 },
    { key: "sarah", body: "Arsenal-Spurs BTTS. North London derby always delivers goals.", minsAgo: 41 },
    { key: "marcus", body: "If your leg dies first you're not living it down till Christmas.", minsAgo: 22 },
    { key: "priya", body: `Combined @ ${liveCombined} — tenner returns nearly ninety. Everyone sweating Sunday 👀`, minsAgo: 8 },
  ];
  for (const m of chat) {
    await prisma.roundMessage.create({
      data: {
        groupId: group.id,
        roundId: locked.id,
        userId: users[m.key].id,
        kind: "user",
        body: m.body,
        createdAt: new Date(now - m.minsAgo * 60 * 1000),
      },
    });
  }

  console.log("Demo seed complete.");
  console.log(`  Group: ${group.name} (invite ${INVITE_CODE})`);
  console.log(`  Locked acca #7 combined odds: ${liveCombined}  → £10 returns £${round(10 * liveCombined)}`);
  console.log(`  Login: danny@demo.tikiacca.com / ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
