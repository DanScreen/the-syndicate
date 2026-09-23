import assert from "node:assert/strict";
import test from "node:test";
import { repairLegLineKey, type LineKeyLeg } from "./repair-line-keys";

function leg(overrides: Partial<LineKeyLeg>): LineKeyLeg {
  return {
    marketType: "over_under_25",
    marketLabel: "Over/Under 2.5 Goals",
    selectionId: "over",
    selectionLabel: "Over 2.5",
    ...overrides,
  };
}

test("leaves half-line and zero keys alone", () => {
  assert.deepEqual(repairLegLineKey(leg({})), { status: "ok" });
  assert.deepEqual(
    repairLegLineKey(
      leg({
        marketType: "asian_handicap_m05",
        marketLabel: "Asian Handicap -0.5",
        selectionId: "home_-0.5",
        selectionLabel: "Arsenal -0.5",
      })
    ),
    { status: "ok" }
  );
  assert.deepEqual(
    repairLegLineKey(
      leg({
        marketType: "asian_handicap_0",
        marketLabel: "Asian Handicap 0",
        selectionId: "home_0",
        selectionLabel: "Arsenal 0",
      })
    ),
    { status: "ok" }
  );
});

test("rewrites legacy single-digit whole lines", () => {
  assert.deepEqual(
    repairLegLineKey(
      leg({ marketType: "over_under_2", marketLabel: "Over/Under Goals O/U 2", selectionLabel: "Under 2" })
    ),
    { status: "fix", marketType: "over_under_20", line: 2 }
  );
  assert.deepEqual(
    repairLegLineKey(
      leg({
        marketType: "asian_handicap_m1",
        marketLabel: "Asian Handicap -1",
        selectionId: "home_-1",
        selectionLabel: "Arsenal -1",
      })
    ),
    { status: "fix", marketType: "asian_handicap_m10", line: -1 }
  );
});

test("reads legacy two-digit whole lines from the label, not the ambiguous key", () => {
  // Legacy "10" meant line 10; under the new encoding "10" means 1.0.
  assert.deepEqual(
    repairLegLineKey(
      leg({
        marketType: "corners_over_under_10",
        marketLabel: "Total Corners O/U 10",
        selectionLabel: "Over 10",
      })
    ),
    { status: "fix", marketType: "corners_over_under_100", line: 10 }
  );
  assert.deepEqual(
    repairLegLineKey(
      leg({
        marketType: "corners_handicap_m2",
        marketLabel: "Corners Handicap +2",
        selectionId: "away_-2",
        selectionLabel: "Chelsea -2",
      })
    ),
    { status: "fix", marketType: "corners_handicap_20", line: 2 }
  );
});

test("rewrites embedded player and team totals", () => {
  assert.deepEqual(
    repairLegLineKey(
      leg({
        marketType: "player_shots__bukayo_saka__1",
        marketLabel: "Bukayo Saka — Shots O/U 1",
        selectionLabel: "Over 1",
      })
    ),
    { status: "fix", marketType: "player_shots__bukayo_saka__10", line: 1 }
  );
});

test("flags quarter lines and ignores markets without a line", () => {
  assert.deepEqual(
    repairLegLineKey(
      leg({ marketType: "over_under_225", marketLabel: "Over/Under 2.25 Goals", selectionLabel: "Over 2.25" })
    ),
    { status: "unsupported", line: 2.25 }
  );
  assert.equal(
    repairLegLineKey(
      leg({ marketType: "player_goal_scorer_anytime__123", marketLabel: "Anytime Scorer", selectionLabel: "Yes" })
    ),
    null
  );
  assert.equal(repairLegLineKey(leg({ marketType: "match_winner" })), null);
});
