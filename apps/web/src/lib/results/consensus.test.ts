import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveMatchConsensus,
  statsFingerprint,
  type ObservationInput,
} from "./consensus";

const at = new Date("2026-10-10T21:00:00.000Z");

function obs(partial: Partial<ObservationInput> & { provider: string }): ObservationInput {
  return {
    status: "FINISHED",
    homeGoals90: 2,
    awayGoals90: 1,
    homeGoalsEnd: 2,
    awayGoalsEnd: 1,
    homeGoalsHt: 1,
    awayGoalsHt: 0,
    extraTime: false,
    stats: null,
    observedAt: at,
    ...partial,
  };
}

describe("resolveMatchConsensus", () => {
  it("agrees when both feeds report the same FT score", () => {
    const r = resolveMatchConsensus([
      obs({ provider: "football_data" }),
      obs({ provider: "api_football" }),
    ]);
    assert.equal(r.kind, "agreed");
    assert.equal(r.status, "FINISHED");
    assert.deepEqual([r.homeGoals, r.awayGoals], [2, 1]);
  });

  it("settles on a single terminal feed while the other is still live", () => {
    const r = resolveMatchConsensus([
      obs({ provider: "api_football", status: "IN_PLAY", homeGoals90: 2, awayGoals90: 1 }),
      obs({ provider: "football_data" }),
    ]);
    assert.equal(r.kind, "single");
    assert.deepEqual(r.providers, ["football_data"]);
    assert.deepEqual([r.homeGoals, r.awayGoals], [2, 1]);
  });

  it("flags a conflict when terminal feeds disagree on the 90' score", () => {
    const r = resolveMatchConsensus([
      obs({ provider: "football_data", homeGoals90: 2, awayGoals90: 2 }),
      obs({ provider: "api_football" }),
    ]);
    assert.equal(r.kind, "conflict");
    assert.equal(r.homeGoals, null);
  });

  it("flags a conflict when one feed says FINISHED and the other POSTPONED", () => {
    const r = resolveMatchConsensus([
      obs({ provider: "football_data", status: "POSTPONED", homeGoals90: null, awayGoals90: null }),
      obs({ provider: "api_football" }),
    ]);
    assert.equal(r.kind, "conflict");
  });

  it("agrees on void statuses regardless of the scores", () => {
    const r = resolveMatchConsensus([
      obs({ provider: "football_data", status: "POSTPONED", homeGoals90: null, awayGoals90: null }),
      obs({ provider: "api_football", status: "CANCELLED", homeGoals90: null, awayGoals90: null }),
    ]);
    assert.equal(r.kind, "agreed");
    assert.equal(r.homeGoals, null);
  });

  it("lets a feed without a 90' split abstain instead of disagreeing", () => {
    const r = resolveMatchConsensus([
      obs({ provider: "football_data", homeGoals90: null, awayGoals90: null, extraTime: true }),
      obs({ provider: "api_football", homeGoals90: 1, awayGoals90: 1, homeGoalsEnd: 2, extraTime: true }),
    ]);
    assert.equal(r.kind, "single");
    assert.deepEqual([r.homeGoals, r.awayGoals], [1, 1]);
    assert.equal(r.wentToExtraTime, true);
  });

  it("abstains when no terminal feed can give the 90' score", () => {
    const r = resolveMatchConsensus([
      obs({ provider: "football_data", homeGoals90: null, awayGoals90: null, extraTime: true }),
    ]);
    assert.equal(r.kind, "abstain");
    assert.equal(r.homeGoals, null);
  });

  it("is pending before any feed finishes and shows the live score", () => {
    const r = resolveMatchConsensus([
      obs({ provider: "football_data", status: "IN_PLAY", homeGoalsEnd: 0, awayGoalsEnd: 0 }),
      obs({ provider: "api_football", status: "IN_PLAY", homeGoalsEnd: 1, awayGoalsEnd: 0 }),
    ]);
    assert.equal(r.kind, "pending");
    assert.equal(r.status, "IN_PLAY");
    assert.deepEqual([r.homeGoals, r.awayGoals], [1, 0]);
  });

  it("is pending with no observations", () => {
    assert.equal(resolveMatchConsensus([]).kind, "pending");
  });

  it("takes stats and half-time from the highest-priority feed that has them", () => {
    const r = resolveMatchConsensus([
      obs({ provider: "football_data", homeGoalsHt: 0, awayGoalsHt: 0 }),
      obs({
        provider: "api_football",
        homeGoalsHt: 1,
        awayGoalsHt: 0,
        stats: { corners: { home: 7, away: 3 } },
      }),
    ]);
    assert.deepEqual([r.homeGoalsHt, r.awayGoalsHt], [1, 0]);
    assert.deepEqual(r.stats?.corners, { home: 7, away: 3 });
  });
});

describe("statsFingerprint", () => {
  it("changes when corners change and ignores key order", () => {
    const a = statsFingerprint({ corners: { home: 5, away: 4 }, yellowCards: null });
    const b = statsFingerprint({ yellowCards: null, corners: { home: 5, away: 4 } });
    const c = statsFingerprint({ corners: { home: 6, away: 4 } });
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.equal(statsFingerprint(null), "");
  });
});
