import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Leg, Round } from "@prisma/client";

import {
  rankGroupsByAccaPoints,
  rankPlayersByPoints,
} from "./compute-platform-leaderboards";

type TestLeg = Pick<Leg, "id" | "roundId" | "userId" | "outcome" | "odds">;
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

describe("rankGroupsByAccaPoints", () => {
  it("ranks by group acca points, not the sum of member leg points", () => {
    // Won acca @ 3.44 (legs 1.6 × 2.15): group = 2.44; members = 0.6 + 1.15 = 1.75
    const winners = {
      id: "g-win",
      name: "Winners",
      ownerName: "Alice",
      members: [
        { legsWon: 1, legsLost: 0 },
        { legsWon: 1, legsLost: 0 },
      ],
      rounds: [
        round("r-win", "settled", [
          leg("l1", "u1", "won", 1.6),
          leg("l2", "u2", "won", 2.15),
        ]),
      ] as never,
    };

    // Lost acca: group = −1; members = +1 (won @ 2.0) + −1 (lost) = 0
    const losers = {
      id: "g-lose",
      name: "Losers",
      ownerName: "Bob",
      members: [
        { legsWon: 1, legsLost: 0 },
        { legsWon: 0, legsLost: 1 },
      ],
      rounds: [
        round(
          "r-lose",
          "settled",
          [leg("l3", "u3", "won", 2.0), leg("l4", "u4", "lost", 1.5)],
          3.0
        ),
      ] as never,
    };

    const ranked = rankGroupsByAccaPoints([losers, winners]);

    assert.equal(ranked.length, 2);
    assert.equal(ranked[0]?.groupId, "g-win");
    assert.equal(ranked[0]?.totalPoints, 2.44);
    assert.equal(ranked[1]?.groupId, "g-lose");
    assert.equal(ranked[1]?.totalPoints, -1);

    // Regression: summing member points would invert / mis-score these groups.
    const memberSumWin = 0.6 + 1.15;
    const memberSumLose = 1 + -1;
    assert.notEqual(ranked[0]?.totalPoints, memberSumWin);
    assert.notEqual(ranked[1]?.totalPoints, memberSumLose);
  });

  it("includes in-progress locked rounds with a decided loss", () => {
    const group = {
      id: "g1",
      name: "Live",
      ownerName: "Chris",
      members: [{ legsWon: 0, legsLost: 1 }],
      rounds: [
        round("locked-bust", "locked", [
          leg("l1", "u1", "lost", 1.5),
          leg("l2", "u2", "pending", 2.0),
        ]),
      ] as never,
    };

    const ranked = rankGroupsByAccaPoints([group]);
    assert.equal(ranked[0]?.totalPoints, -1);
  });

  it("excludes empty groups", () => {
    const ranked = rankGroupsByAccaPoints([
      {
        id: "empty",
        name: "Empty",
        ownerName: "Dana",
        members: [],
        rounds: [],
      },
    ]);
    assert.equal(ranked.length, 0);
  });

  it("excludes the marketing demo group by invite code and owner email", () => {
    const real = {
      id: "g-real",
      name: "Real Group",
      ownerName: "Eve",
      ownerEmail: "eve@example.com",
      inviteCode: "REAL01",
      members: [{ legsWon: 1, legsLost: 0 }],
      rounds: [
        round("r1", "settled", [leg("l1", "u1", "won", 2.0)], 2.0),
      ] as never,
    };
    const byInvite = {
      id: "g-demo-invite",
      name: "The Thursday Club",
      ownerName: "Danny Walsh",
      ownerEmail: "danny@demo.tikiacca.com",
      inviteCode: "DEMO24",
      members: [{ legsWon: 5, legsLost: 0 }],
      rounds: [
        round("r-demo", "settled", [leg("l2", "u2", "won", 5.0)], 5.0),
      ] as never,
    };
    const byOwner = {
      id: "g-demo-owner",
      name: "Other Demo",
      ownerName: "Sarah",
      ownerEmail: "sarah@demo.tikiacca.com",
      inviteCode: "OTHER1",
      members: [{ legsWon: 2, legsLost: 0 }],
      rounds: [] as never,
    };

    const ranked = rankGroupsByAccaPoints([byInvite, real, byOwner]);
    assert.equal(ranked.length, 1);
    assert.equal(ranked[0]?.groupId, "g-real");
    assert.equal(ranked[0]?.rank, 1);
  });
});

describe("rankPlayersByPoints", () => {
  it("excludes @demo.tikiacca.com accounts and re-ranks", () => {
    const ranked = rankPlayersByPoints([
      {
        id: "demo",
        name: "Danny Walsh",
        email: "danny@demo.tikiacca.com",
        totalPoints: 99,
        legsWon: 10,
        legsLost: 0,
        groupCount: 1,
      },
      {
        id: "real",
        name: "Real User",
        email: "real@example.com",
        totalPoints: 5,
        legsWon: 2,
        legsLost: 1,
        groupCount: 1,
      },
    ]);

    assert.equal(ranked.length, 1);
    assert.equal(ranked[0]?.userId, "real");
    assert.equal(ranked[0]?.rank, 1);
    assert.equal(ranked[0]?.totalPoints, 5);
  });
});
