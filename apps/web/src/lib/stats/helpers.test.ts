import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Leg, Round } from "@prisma/client";

import {
  groupNetPoints,
  memberNetPointsAcrossRounds,
  memberPointsInRound,
  roundAccaDecided,
  roundAccaWon,
  roundGroupPoints,
  roundsForPerformanceStats,
} from "./helpers";

type TestLeg = Pick<
  Leg,
  "id" | "roundId" | "userId" | "outcome" | "odds"
>;

type TestRound = Pick<
  Round,
  "id" | "status" | "combinedOdds" | "settledAt" | "lockedAt" | "createdAt"
> & { legs: TestLeg[] };

function leg(
  id: string,
  userId: string,
  outcome: string,
  odds: number,
  roundId = "r1"
): TestLeg {
  return { id, roundId, userId, outcome, odds };
}

function round(
  id: string,
  status: string,
  legs: TestLeg[],
  combinedOdds = 3.44
): TestRound {
  return {
    id,
    status,
    combinedOdds,
    settledAt: status === "settled" ? new Date("2026-01-02T12:00:00Z") : null,
    lockedAt: status === "locked" ? new Date("2026-01-01T18:00:00Z") : null,
    createdAt: new Date("2026-01-01T12:00:00Z"),
    legs: legs.map((l) => ({ ...l, roundId: id })),
  };
}

describe("stats helpers — partial settlement", () => {
  it("includes locked rounds with resolved legs in performance stats", () => {
    const rounds = [
      round("settled-1", "settled", [
        leg("l1", "u1", "won", 1.6),
        leg("l2", "u2", "won", 2.15),
      ]),
      round("locked-1", "locked", [
        leg("l3", "u1", "won", 2.0),
        leg("l4", "u2", "pending", 1.8),
      ]),
      round("locked-empty", "locked", [
        leg("l5", "u1", "pending", 1.5),
        leg("l6", "u2", "pending", 1.7),
      ]),
    ];

    const performance = roundsForPerformanceStats(rounds as never);
    assert.equal(performance.length, 2);
    assert.equal(performance[0]?.id, "locked-1");
    assert.equal(performance[1]?.id, "settled-1");
  });

  it("awards member points for resolved legs on a locked round", () => {
    const locked = round("locked-1", "locked", [
      leg("l1", "u1", "won", 2.0),
      leg("l2", "u2", "lost", 1.5),
      leg("l3", "u1", "pending", 1.9),
    ]);

    assert.equal(memberPointsInRound(locked as never, "u1"), 1);
    assert.equal(memberPointsInRound(locked as never, "u2"), -1);
  });

  it("awards group -1 when a leg loses before the round settles", () => {
    const locked = round("locked-1", "locked", [
      leg("l1", "u1", "won", 2.0),
      leg("l2", "u2", "lost", 1.5),
      leg("l3", "u1", "pending", 1.9),
    ]);

    assert.equal(roundGroupPoints(locked as never), -1);
    assert.equal(roundAccaDecided(locked as never), true);
    assert.equal(roundAccaWon(locked as never), false);
  });

  it("keeps group points at 0 while an acca is still live on a locked round", () => {
    const locked = round("locked-1", "locked", [
      leg("l1", "u1", "won", 2.0),
      leg("l2", "u2", "won", 1.5),
      leg("l3", "u1", "pending", 1.9),
    ]);

    assert.equal(roundGroupPoints(locked as never), 0);
    assert.equal(roundAccaDecided(locked as never), false);
  });

  it("sums settled and in-progress points across rounds", () => {
    const rounds = [
      round("settled-1", "settled", [
        leg("l1", "u1", "won", 2.0),
        leg("l2", "u2", "lost", 1.5),
      ]),
      round("locked-1", "locked", [
        leg("l3", "u1", "won", 1.8),
        leg("l4", "u2", "pending", 2.1),
      ]),
    ];

    assert.equal(memberNetPointsAcrossRounds(rounds as never, "u1"), 1.8);
    assert.equal(groupNetPoints(rounds as never), -1);
  });

  it("counts deferred leg points on an early-settled round", () => {
    const earlySettled = round("settled-early", "settled", [
      leg("l1", "u1", "lost", 1.5),
      leg("l2", "u2", "won", 2.2),
      leg("l3", "u1", "pending", 1.9),
    ]);

    assert.equal(roundGroupPoints(earlySettled as never), -1);
    assert.equal(memberPointsInRound(earlySettled as never, "u2"), 1.2);

    earlySettled.legs[2]!.outcome = "won";
    assert.equal(memberPointsInRound(earlySettled as never, "u1"), -0.1);
  });
});
