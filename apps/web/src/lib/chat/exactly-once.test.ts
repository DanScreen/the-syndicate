/**
 * Integration tests for the exactly-once guarantees of system chat messages
 * (specs/group-chat.md). Runs against the local dev PostgreSQL:
 *
 *   npm test --workspace=@tiki-acca/web
 *
 * A retried settlement and a lock race must each produce exactly one
 * system message — the writes are gated on the same atomic claims that
 * make settlement and lock exactly-once.
 */
import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

// Force mock odds mode so lock repricing falls back to stored leg odds.
delete process.env.ODDS_API_KEY;
process.env.ODDS_DB_ONLY = "";

import { prisma } from "@tiki-acca/database";
import type { LegOutcome } from "@tiki-acca/shared";
import {
  applyRoundSettlement,
  RoundNotSettleableError,
} from "@/lib/settlement/apply-round-settlement";
import { persistResolvableLegOutcomes } from "@/lib/settlement/resolve-round-outcomes";
import { claimAndLockRound } from "@/lib/rounds/claim-lock-round";

const createdUserIds: string[] = [];
const createdGroupIds: string[] = [];

async function createUser(name: string) {
  const user = await prisma.user.create({
    data: {
      firstName: name,
      lastName: "Test",
      name: `${name} Test`,
      email: `${name.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`,
      passwordHash: "not-a-real-hash",
    },
  });
  createdUserIds.push(user.id);
  return user;
}

async function createGroupWithRound(options: {
  ownerId: string;
  memberIds: string[];
  roundStatus: "open" | "locked";
  combinedOdds?: number;
}) {
  const group = await prisma.group.create({
    data: {
      name: `Chat test ${Math.random().toString(36).slice(2)}`,
      inviteCode: Math.random().toString(36).slice(2, 12),
      ownerId: options.ownerId,
      members: {
        create: options.memberIds.map((userId, i) => ({
          userId,
          role: i === 0 ? "owner" : "member",
        })),
      },
    },
  });
  createdGroupIds.push(group.id);

  const round = await prisma.round.create({
    data: {
      groupId: group.id,
      status: options.roundStatus,
      combinedOdds: options.combinedOdds,
      lockedAt: options.roundStatus === "locked" ? new Date() : undefined,
    },
  });

  return { group, round };
}

async function createLeg(roundId: string, userId: string, odds: number, label: string) {
  return prisma.leg.create({
    data: {
      roundId,
      userId,
      fixtureId: `fixture-${label}-${Math.random().toString(36).slice(2)}`,
      homeTeam: "Home FC",
      awayTeam: "Away FC",
      competitionId: "world-cup",
      competition: "World Cup",
      kickoff: new Date(Date.now() + 60 * 60 * 1000),
      marketType: "h2h",
      marketLabel: "Match result",
      selectionId: "home",
      selectionLabel: label,
      odds,
      bookmakerId: "bet365",
      bookmakerName: "bet365",
    },
  });
}

function countMessages(roundId: string, eventType: string) {
  return prisma.roundMessage.count({ where: { roundId, eventType } });
}

after(async () => {
  await prisma.group.deleteMany({ where: { id: { in: createdGroupIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.$disconnect();
});

describe("system chat messages are exactly-once", () => {
  it("a retried settlement posts one round_settled and one leg_result per leg", async () => {
    const alice = await createUser("Alice");
    const bob = await createUser("Bob");
    const { round } = await createGroupWithRound({
      ownerId: alice.id,
      memberIds: [alice.id, bob.id],
      roundStatus: "locked",
      combinedOdds: 3.44,
    });
    const legA = await createLeg(round.id, alice.id, 1.6, "Alice pick");
    const legB = await createLeg(round.id, bob.id, 2.15, "Bob pick");

    const outcomes = new Map<string, LegOutcome>([
      [legA.id, "won"],
      [legB.id, "won"],
    ]);

    // Two concurrent settle attempts (overlapping cron runs) + a later retry:
    // exactly one wins the locked → settled claim, the rest are benign no-ops.
    const concurrent = await Promise.allSettled([
      applyRoundSettlement(round.id, outcomes),
      applyRoundSettlement(round.id, outcomes),
    ]);
    const wins = concurrent.filter((r) => r.status === "fulfilled");
    assert.equal(wins.length, 1, "exactly one settlement attempt should win");

    await assert.rejects(
      () => applyRoundSettlement(round.id, outcomes),
      RoundNotSettleableError,
      "a retried settlement must be a benign no-op"
    );

    assert.equal(await countMessages(round.id, "round_settled"), 1);
    assert.equal(await countMessages(round.id, "leg_result"), 2);
  });

  it("overlapping outcome persists post one leg_result per leg", async () => {
    const cara = await createUser("Cara");
    const { round } = await createGroupWithRound({
      ownerId: cara.id,
      memberIds: [cara.id],
      roundStatus: "locked",
      combinedOdds: 2.0,
    });
    const leg = await createLeg(round.id, cara.id, 2.0, "Cara pick");
    const outcomes = new Map<string, LegOutcome>([[leg.id, "won"]]);

    // Same pending leg persisted by two overlapping cron runs.
    const [first, second] = await Promise.all([
      persistResolvableLegOutcomes([leg], outcomes),
      persistResolvableLegOutcomes([leg], outcomes),
    ]);
    assert.equal(first + second, 1, "only one run should claim the leg");
    assert.equal(await countMessages(round.id, "leg_result"), 1);

    // A later rerun (leg row now resolved) is a no-op.
    const fresh = await prisma.leg.findUniqueOrThrow({ where: { id: leg.id } });
    assert.equal(await persistResolvableLegOutcomes([fresh], outcomes), 0);
    assert.equal(await countMessages(round.id, "leg_result"), 1);
  });

  it("a lock race posts exactly one round_locked message", async () => {
    const dave = await createUser("Dave");
    const { round } = await createGroupWithRound({
      ownerId: dave.id,
      memberIds: [dave.id],
      roundStatus: "open",
    });
    await createLeg(round.id, dave.id, 1.8, "Dave pick");

    // Two concurrent lock attempts (final submit + kickoff cron): only the
    // claim winner prices the acca and announces the lock.
    const results = await Promise.all([
      claimAndLockRound(round.id),
      claimAndLockRound(round.id),
    ]);
    assert.equal(results.filter((r) => r.ok).length, 1, "exactly one lock should win");

    // A retry after the round is locked is a no-op.
    const retry = await claimAndLockRound(round.id);
    assert.equal(retry.ok, false);

    assert.equal(await countMessages(round.id, "round_locked"), 1);
  });
});
