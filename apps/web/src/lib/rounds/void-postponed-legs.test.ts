import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import type { Match, User } from "@prisma/client";
import { prisma } from "@tiki-acca/database";
import { RESULT_CONFIRMATION_MS } from "@tiki-acca/shared";
import { tryAutoSettleRound } from "@/lib/settlement/auto-settle-round";
import { voidPostponedLegs } from "./void-postponed-legs";

const groupIds: string[] = [];
const userIds: string[] = [];
const matchIds: string[] = [];

const HOUR_MS = 60 * 60 * 1000;

type LegSpec = {
  /** Hours from now (negative = kicked off). */
  kickoffInHours: number;
  matchStatus: "SCHEDULED" | "POSTPONED" | "FINISHED_WON";
  outcome?: "pending" | "void";
};

/**
 * One group, one member per leg, one round. A unique competition id keeps
 * other tests' matches out of the leg ↔ match lookup.
 */
async function createRound(
  status: "open" | "locked",
  specs: LegSpec[],
  combinedOdds: number | null = null
) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const competitionId = `void-test-${suffix}`;

  const users: User[] = [];
  for (const i of specs.keys()) {
    const user = await prisma.user.create({
      data: {
        firstName: `Void${i}`,
        lastName: "Tester",
        name: `Void${i}`,
        email: `void-${i}-${suffix}@example.test`,
        passwordHash: "not-a-real-hash",
      },
    });
    userIds.push(user.id);
    users.push(user);
  }

  const matches: { match: Match; kickoff: Date }[] = [];
  for (const [i, spec] of specs.entries()) {
    const kickoff = new Date(Date.now() + spec.kickoffInHours * HOUR_MS);
    const finished = spec.matchStatus === "FINISHED_WON";
    const since = new Date(Date.now() - RESULT_CONFIRMATION_MS - 60_000);
    const match = await prisma.match.create({
      data: {
        competitionId,
        kickoff,
        homeTeam: `Home${i}`,
        awayTeam: `Away${i}`,
        status: finished ? "FINISHED" : spec.matchStatus,
        homeGoals: finished ? 2 : null,
        awayGoals: finished ? 0 : null,
        finishedAt: finished ? since : null,
        scoreStableSince: finished ? since : null,
        resultSource: finished ? "single" : null,
      },
    });
    matchIds.push(match.id);
    matches.push({ match, kickoff });
  }

  const group = await prisma.group.create({
    data: {
      name: `Void test ${suffix}`,
      inviteCode: Math.random().toString(36).slice(2, 12),
      ownerId: users[0]!.id,
      status,
      members: {
        create: users.map((u, i) => ({ userId: u.id, role: i === 0 ? "owner" : "member" })),
      },
      rounds: {
        create: {
          status,
          betNumber: 1,
          lockedAt: status === "locked" ? new Date() : null,
          combinedOdds,
          legs: {
            create: specs.map((spec, i) => ({
              userId: users[i]!.id,
              legIndex: 1,
              fixtureId: `evt-${suffix}-${i}`,
              matchId: matches[i]!.match.id,
              homeTeam: `Home${i}`,
              awayTeam: `Away${i}`,
              competitionId,
              competition: "League Two",
              kickoff: matches[i]!.kickoff,
              marketType: "match_winner",
              marketLabel: "Match result",
              selectionId: "home",
              selectionLabel: `Home${i}`,
              odds: 2,
              outcome: spec.outcome ?? "pending",
              bookmakerId: "williamhill",
              bookmakerName: "William Hill",
            })),
          },
        },
      },
    },
    include: { rounds: { include: { legs: { orderBy: { homeTeam: "asc" } } } } },
  });
  groupIds.push(group.id);

  const round = group.rounds[0]!;
  return { group, round, legs: round.legs, matches: matches.map((m) => m.match) };
}

async function systemEvents(roundId: string) {
  const messages = await prisma.roundMessage.findMany({
    where: { roundId, kind: "system" },
    orderBy: { createdAt: "asc" },
  });
  return messages.map((m) => m.eventType);
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

describe("voidPostponedLegs", () => {
  it("voids a postponed pick and reopens the locked acca until the next kickoff", async () => {
    const { group, round, legs } = await createRound(
      "locked",
      [
        { kickoffInHours: 1, matchStatus: "POSTPONED" },
        { kickoffInHours: 3, matchStatus: "SCHEDULED" },
      ],
      4
    );

    const result = await voidPostponedLegs({ roundIds: [round.id] });

    assert.deepEqual(result.voided, [legs[0]!.id]);
    assert.deepEqual(result.reopened, [round.id]);
    const leg = await prisma.leg.findUniqueOrThrow({ where: { id: legs[0]!.id } });
    assert.equal(leg.outcome, "void");
    const reopened = await prisma.round.findUniqueOrThrow({ where: { id: round.id } });
    assert.equal(reopened.status, "open");
    assert.ok(reopened.reopenedAt);
    const g = await prisma.group.findUniqueOrThrow({ where: { id: group.id } });
    assert.equal(g.status, "open");
    assert.deepEqual(await systemEvents(round.id), ["leg_result", "round_reopened"]);

    // Idempotent on the next cron run.
    const again = await voidPostponedLegs({ roundIds: [round.id] });
    assert.deepEqual(again.voided, []);
    assert.deepEqual(again.reopened, []);
    assert.deepEqual(await systemEvents(round.id), ["leg_result", "round_reopened"]);
  });

  it("reopens a locked acca whose leg was already voided by settlement", async () => {
    const { round } = await createRound(
      "locked",
      [
        { kickoffInHours: 1, matchStatus: "POSTPONED", outcome: "void" },
        { kickoffInHours: 3, matchStatus: "SCHEDULED" },
      ],
      4
    );

    const result = await voidPostponedLegs({ roundIds: [round.id] });

    assert.deepEqual(result.voided, []);
    assert.deepEqual(result.reopened, [round.id]);
  });

  it("leaves the acca locked once the other legs have kicked off", async () => {
    const { round, legs } = await createRound(
      "locked",
      [
        { kickoffInHours: -1, matchStatus: "POSTPONED" },
        { kickoffInHours: -0.5, matchStatus: "SCHEDULED" },
      ],
      4
    );

    const result = await voidPostponedLegs({ roundIds: [round.id] });

    assert.deepEqual(result.voided, [legs[0]!.id]);
    assert.deepEqual(result.reopened, []);
    const after = await prisma.round.findUniqueOrThrow({ where: { id: round.id } });
    assert.equal(after.status, "locked");
    assert.equal(after.reopenedAt, null);
  });

  it("voids a pick on an open acca without reopening anything", async () => {
    const { round, legs } = await createRound("open", [
      { kickoffInHours: 1, matchStatus: "POSTPONED" },
      { kickoffInHours: 3, matchStatus: "SCHEDULED" },
    ]);

    const result = await voidPostponedLegs({ roundIds: [round.id] });

    assert.deepEqual(result.voided, [legs[0]!.id]);
    assert.deepEqual(result.reopened, []);
    const after = await prisma.round.findUniqueOrThrow({ where: { id: round.id } });
    assert.equal(after.status, "open");
    assert.equal(after.reopenedAt, null);
    assert.deepEqual(await systemEvents(round.id), ["leg_result"]);
  });
});

describe("settling an acca with a void leg", () => {
  it("pays out without the void leg, and keeps it void when the match is rescheduled", async () => {
    // Priced at 2 × 2 = 4 before one leg was postponed; that match is now
    // back on the schedule for another day.
    const { round, legs } = await createRound(
      "locked",
      [
        { kickoffInHours: -4, matchStatus: "SCHEDULED", outcome: "void" },
        { kickoffInHours: -3, matchStatus: "FINISHED_WON" },
      ],
      4
    );

    const result = await tryAutoSettleRound(round.id);
    assert.equal(result.status, "settled");
    const settled = await prisma.round.findUniqueOrThrow({ where: { id: round.id } });
    // £10 at 2.00 (the void leg counts at 1.00), not 4.00.
    assert.equal(settled.profitLossGbp, 10);
    const voidLeg = await prisma.leg.findUniqueOrThrow({ where: { id: legs[0]!.id } });
    assert.equal(voidLeg.outcome, "void");
  });
});
