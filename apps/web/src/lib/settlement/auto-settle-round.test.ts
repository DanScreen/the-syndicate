import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { prisma } from "@tiki-acca/database";
import { RESULT_CONFIRMATION_MS } from "@tiki-acca/shared";
import { reconcileMatchLegOutcomes } from "@/lib/results/reconcile-match-legs";
import { tryAutoSettleRound } from "./auto-settle-round";

const groupIds: string[] = [];
const userIds: string[] = [];
const matchIds: string[] = [];

const HOUR_MS = 60 * 60 * 1000;
const FIXTURES = [
  { home: "Norway", away: "Denmark" },
  { home: "Spain", away: "Portugal" },
];

type MatchState =
  | { status: "SCHEDULED" }
  | { status: "FINISHED"; home: number; away: number; confirmed: boolean };

function matchData(state: MatchState, now = Date.now()) {
  if (state.status === "SCHEDULED") {
    return { status: "SCHEDULED", homeGoals: null, awayGoals: null, finishedAt: null, scoreStableSince: null };
  }
  // Unconfirmed: FT score first seen just now. Confirmed: stable for longer
  // than the confirmation window.
  const since = new Date(state.confirmed ? now - RESULT_CONFIRMATION_MS - 60_000 : now);
  return {
    status: "FINISHED",
    homeGoals: state.home,
    awayGoals: state.away,
    finishedAt: since,
    scoreStableSince: since,
    resultSource: "single",
  };
}

/**
 * One member, one locked round with an Over 2.5 leg on each given match.
 * A unique competition id keeps reconcile's unlinked-leg sweep away from
 * other tests' legs.
 */
async function createRound(states: MatchState[]) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const competitionId = `test-${suffix}`;
  const kickoff = new Date(Date.now() - 2 * HOUR_MS);

  const user = await prisma.user.create({
    data: {
      firstName: "Settle",
      lastName: "Tester",
      name: "Settle Tester",
      email: `settle-${suffix}@example.test`,
      passwordHash: "not-a-real-hash",
    },
  });
  userIds.push(user.id);

  const matches = [];
  for (const [i, state] of states.entries()) {
    const match = await prisma.match.create({
      data: {
        competitionId,
        kickoff,
        homeTeam: FIXTURES[i]!.home,
        awayTeam: FIXTURES[i]!.away,
        ...matchData(state),
      },
    });
    matchIds.push(match.id);
    matches.push(match);
  }

  const group = await prisma.group.create({
    data: {
      name: `Settle test ${suffix}`,
      inviteCode: Math.random().toString(36).slice(2, 12),
      ownerId: user.id,
      members: { create: { userId: user.id, role: "owner" } },
      rounds: {
        create: {
          status: "locked",
          betNumber: 1,
          lockedAt: new Date(),
          legsPerMember: states.length,
          combinedOdds: 1.7 ** states.length,
          legs: {
            create: matches.map((match, i) => ({
              userId: user.id,
              legIndex: i,
              fixtureId: `evt-${suffix}-${i}`,
              matchId: match.id,
              homeTeam: match.homeTeam,
              awayTeam: match.awayTeam,
              competitionId,
              competition: "UEFA Nations League",
              kickoff,
              marketType: "over_under_25",
              marketLabel: "Over/Under 2.5 Goals",
              selectionId: "over",
              selectionLabel: "Over 2.5",
              odds: 1.7,
              bookmakerId: "williamhill",
              bookmakerName: "William Hill",
            })),
          },
        },
      },
    },
    include: { rounds: { include: { legs: { orderBy: { legIndex: "asc" } } } } },
  });
  groupIds.push(group.id);

  const round = group.rounds[0]!;
  return { user, group, round, legs: round.legs, matches };
}

async function setMatch(matchId: string, state: MatchState) {
  await prisma.match.update({ where: { id: matchId }, data: matchData(state) });
}

async function memberTotals(groupId: string, userId: string) {
  const member = await prisma.groupMember.findUniqueOrThrow({
    where: { groupId_userId: { groupId, userId } },
  });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return { member, user };
}

/** Settlement fires `notifyRoundSettled` without awaiting it — let those finish before deleting their rounds. */
async function waitForSettleNotifications(timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const unsent = await prisma.round.count({
      where: { groupId: { in: groupIds }, status: "settled", settledNotificationSentAt: null },
    });
    if (unsent === 0) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

after(async () => {
  await waitForSettleNotifications();
  await prisma.group.deleteMany({ where: { id: { in: groupIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.match.deleteMany({ where: { id: { in: matchIds } } });
  await prisma.$disconnect();
});

describe("auto-settle with provisional results", () => {
  it("writes a provisional loss at FT but does not bust the acca", async () => {
    const { round, legs } = await createRound([
      { status: "FINISHED", home: 1, away: 0, confirmed: false },
      { status: "SCHEDULED" },
    ]);

    const result = await tryAutoSettleRound(round.id);

    assert.equal(result.status, "pending");
    const leg = await prisma.leg.findUniqueOrThrow({ where: { id: legs[0]!.id } });
    assert.equal(leg.outcome, "lost", "members see the result straight away");
    const after = await prisma.round.findUniqueOrThrow({ where: { id: round.id } });
    assert.equal(after.status, "locked", "a provisional loss must not settle the round");
  });

  it("busts the acca once the losing score is confirmed", async () => {
    const { round, matches } = await createRound([
      { status: "FINISHED", home: 1, away: 0, confirmed: false },
      { status: "SCHEDULED" },
    ]);
    await tryAutoSettleRound(round.id);

    await setMatch(matches[0]!.id, { status: "FINISHED", home: 1, away: 0, confirmed: true });
    const result = await tryAutoSettleRound(round.id);

    assert.equal(result.status, "settled");
  });

  it("does not settle an all-won acca until every result is confirmed", async () => {
    const { round, legs, matches } = await createRound([
      { status: "FINISHED", home: 3, away: 2, confirmed: true },
      { status: "FINISHED", home: 2, away: 2, confirmed: false },
    ]);

    const pending = await tryAutoSettleRound(round.id);
    assert.equal(pending.status, "pending");
    const leg = await prisma.leg.findUniqueOrThrow({ where: { id: legs[1]!.id } });
    assert.equal(leg.outcome, "won");

    await setMatch(matches[1]!.id, { status: "FINISHED", home: 2, away: 2, confirmed: true });
    const settled = await tryAutoSettleRound(round.id);
    assert.equal(settled.status, "settled");
  });

  it("a corrected provisional loss keeps the acca alive and awards points exactly once", async () => {
    const { user, group, round, legs, matches } = await createRound([
      { status: "FINISHED", home: 1, away: 0, confirmed: false },
      { status: "SCHEDULED" },
    ]);
    await tryAutoSettleRound(round.id);

    // Feed corrects the provisional FT score: a goal it missed makes it 2–1.
    await setMatch(matches[0]!.id, { status: "FINISHED", home: 2, away: 1, confirmed: false });
    const reconcile = await reconcileMatchLegOutcomes(matches[0]!.id);
    assert.equal(reconcile.legsCorrected, 1);

    const corrected = await prisma.leg.findUniqueOrThrow({ where: { id: legs[0]!.id } });
    assert.equal(corrected.outcome, "won");
    const beforeSettle = await memberTotals(group.id, user.id);
    assert.equal(beforeSettle.member.points, 0, "no points move on a locked round");
    assert.equal(beforeSettle.member.legsWon, 0);
    assert.equal(beforeSettle.member.legsLost, 0);
    const stillLocked = await prisma.round.findUniqueOrThrow({ where: { id: round.id } });
    assert.equal(stillLocked.status, "locked");

    await setMatch(matches[0]!.id, { status: "FINISHED", home: 2, away: 1, confirmed: true });
    await setMatch(matches[1]!.id, { status: "FINISHED", home: 2, away: 2, confirmed: true });
    const settled = await tryAutoSettleRound(round.id);
    assert.equal(settled.status, "settled");

    const settledLegs = await prisma.leg.findMany({ where: { roundId: round.id } });
    const awarded = settledLegs.reduce((sum, l) => sum + l.pointsAwarded, 0);
    const totals = await memberTotals(group.id, user.id);
    assert.ok(awarded > 0);
    assert.equal(totals.member.points, awarded);
    assert.equal(totals.user.totalPoints, awarded);
    assert.equal(totals.member.legsWon, 2);
    assert.equal(totals.member.legsLost, 0);
    assert.equal(totals.user.legsWon, 2);
  });
});
