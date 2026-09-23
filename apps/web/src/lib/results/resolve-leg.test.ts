import assert from "node:assert/strict";
import test from "node:test";
import { handicapMarketType, overUnderMarketType } from "@/lib/odds/market-builders";
import { resolveLegOutcome } from "./resolve-leg";

const finished = (homeGoals: number, awayGoals: number) => ({
  homeGoals,
  awayGoals,
  status: "FINISHED",
});

test("whole-number goal lines settle against the real line, pushing on the number", () => {
  const marketType = overUnderMarketType("", 2)!;
  assert.equal(marketType, "over_under_20");

  // Under the old encoding "over_under_2" decoded to 0.2, so Over won on one goal.
  assert.equal(resolveLegOutcome({ marketType, selectionId: "over" }, finished(1, 0)), "lost");
  assert.equal(resolveLegOutcome({ marketType, selectionId: "under" }, finished(1, 0)), "won");
  assert.equal(resolveLegOutcome({ marketType, selectionId: "over" }, finished(1, 1)), "void");
  assert.equal(resolveLegOutcome({ marketType, selectionId: "over" }, finished(2, 1)), "won");
});

test("half goal lines are unchanged", () => {
  const marketType = overUnderMarketType("", 2.5)!;
  assert.equal(marketType, "over_under_25");
  assert.equal(resolveLegOutcome({ marketType, selectionId: "over" }, finished(2, 1)), "won");
  assert.equal(resolveLegOutcome({ marketType, selectionId: "over" }, finished(1, 1)), "lost");
});

test("whole-number asian handicaps settle from the selection point", () => {
  const marketType = handicapMarketType("asian", -1)!;
  assert.equal(marketType, "asian_handicap_m10");
  assert.equal(resolveLegOutcome({ marketType, selectionId: "home_-1" }, finished(2, 1)), "void");
  assert.equal(resolveLegOutcome({ marketType, selectionId: "home_-1" }, finished(3, 1)), "won");
  assert.equal(resolveLegOutcome({ marketType, selectionId: "away_1" }, finished(1, 1)), "won");
});

test("corners and cards totals are left for manual settlement", () => {
  const marketType = overUnderMarketType("corners", 10)!;
  assert.equal(marketType, "corners_over_under_100");
  assert.equal(resolveLegOutcome({ marketType, selectionId: "over" }, finished(3, 2)), null);
});
