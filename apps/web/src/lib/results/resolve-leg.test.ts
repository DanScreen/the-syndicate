import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { handicapMarketType, overUnderMarketType } from "@/lib/odds/market-builders";
import { alignResultToLeg } from "./match-store";
import { resolveLegOutcome, type MatchResult } from "./resolve-leg";

const finished = (corners: { home: number; away: number } | null, extra = false): MatchResult => ({
  homeGoals: 1,
  awayGoals: 0,
  status: "FINISHED",
  extraTime: extra,
  stats: corners ? { corners } : null,
});

const leg = (marketType: string, selectionId: string) => ({
  marketType,
  selectionId,
  homeTeam: "Brighton and Hove Albion",
  awayTeam: "Manchester City",
});

describe("corners settlement", () => {
  const result = finished({ home: 6, away: 4 });

  it("settles corners 1X2", () => {
    assert.equal(resolveLegOutcome(leg("corners_1x2", "home"), result), "won");
    assert.equal(resolveLegOutcome(leg("corners_1x2", "draw"), result), "lost");
  });

  it("settles total corners over/under", () => {
    assert.equal(resolveLegOutcome(leg("corners_over_under_95", "over"), result), "won");
    assert.equal(resolveLegOutcome(leg("corners_over_under_105", "under"), result), "won");
    assert.equal(resolveLegOutcome(leg("corners_over_under_85", "under"), result), "lost");
  });

  it("settles corners handicap", () => {
    assert.equal(resolveLegOutcome(leg("corners_handicap_m15", "home_-1.5"), result), "won");
    assert.equal(resolveLegOutcome(leg("corners_handicap_m25", "home_-2.5"), result), "lost");
    assert.equal(resolveLegOutcome(leg("corners_handicap_m2", "home_-2"), result), "void");
    assert.equal(resolveLegOutcome(leg("corners_handicap_m15", "away_1.5"), result), "lost");
  });

  it("settles team corners by matching the slug to the leg's team", () => {
    assert.equal(
      resolveLegOutcome(leg("team_corners__manchester_city__35", "over"), result),
      "won"
    );
    assert.equal(
      resolveLegOutcome(leg("team_corners__brighton_and_hove_albion__65", "over"), result),
      "lost"
    );
    assert.equal(resolveLegOutcome(leg("team_corners__arsenal__35", "over"), result), null);
  });

  it("waits (null) when stats are missing or unconfirmed", () => {
    assert.equal(resolveLegOutcome(leg("corners_1x2", "home"), finished(null)), null);
  });

  it("does not settle corners after extra time", () => {
    assert.equal(
      resolveLegOutcome(leg("corners_over_under_95", "over"), finished({ home: 9, away: 5 }, true)),
      null
    );
  });

  it("voids corners legs on a postponed match", () => {
    assert.equal(
      resolveLegOutcome(leg("corners_1x2", "home"), { homeGoals: 0, awayGoals: 0, status: "POSTPONED" }),
      "void"
    );
  });

  it("still settles goal markets on the 90' score", () => {
    assert.equal(resolveLegOutcome(leg("match_winner", "home"), result), "won");
    assert.equal(resolveLegOutcome(leg("over_under_15", "under"), result), "won");
  });
});

describe("alignResultToLeg", () => {
  it("swaps goals, half-time and corners when the leg is reversed", () => {
    const aligned = alignResultToLeg(
      {
        homeGoals: 2,
        awayGoals: 1,
        status: "FINISHED",
        halfTime: { home: 1, away: 0 },
        stats: { corners: { home: 8, away: 2 } },
      },
      { homeTeam: "Wales", awayTeam: "Turkey" },
      { homeTeam: "Turkey", awayTeam: "Wales" }
    );
    assert.deepEqual([aligned?.homeGoals, aligned?.awayGoals], [1, 2]);
    assert.deepEqual(aligned?.halfTime, { home: 0, away: 1 });
    assert.deepEqual(aligned?.stats?.corners, { home: 2, away: 8 });
  });

  it("returns null when the teams don't match", () => {
    assert.equal(
      alignResultToLeg(
        { homeGoals: 0, awayGoals: 0, status: "FINISHED" },
        { homeTeam: "Wales", awayTeam: "Turkey" },
        { homeTeam: "Spain", awayTeam: "Italy" }
      ),
      null
    );
  });
});

describe("whole-number lines", () => {
  const goals = (homeGoals: number, awayGoals: number): MatchResult => ({
    homeGoals,
    awayGoals,
    status: "FINISHED",
  });

  it("settles goal O/U against the real line, pushing on the number", () => {
    const marketType = overUnderMarketType("", 2)!;
    assert.equal(marketType, "over_under_20");

    // The old "over_under_2" decoded to 0.2, so Over won on a single goal.
    assert.equal(resolveLegOutcome({ marketType, selectionId: "over" }, goals(1, 0)), "lost");
    assert.equal(resolveLegOutcome({ marketType, selectionId: "under" }, goals(1, 0)), "won");
    assert.equal(resolveLegOutcome({ marketType, selectionId: "over" }, goals(1, 1)), "void");
    assert.equal(resolveLegOutcome({ marketType, selectionId: "over" }, goals(2, 1)), "won");
  });

  it("leaves half goal lines unchanged", () => {
    const marketType = overUnderMarketType("", 2.5)!;
    assert.equal(marketType, "over_under_25");
    assert.equal(resolveLegOutcome({ marketType, selectionId: "over" }, goals(2, 1)), "won");
    assert.equal(resolveLegOutcome({ marketType, selectionId: "over" }, goals(1, 1)), "lost");
  });

  it("settles whole asian handicaps from the selection point", () => {
    const marketType = handicapMarketType("asian", -1)!;
    assert.equal(marketType, "asian_handicap_m10");
    assert.equal(resolveLegOutcome({ marketType, selectionId: "home_-1" }, goals(2, 1)), "void");
    assert.equal(resolveLegOutcome({ marketType, selectionId: "home_-1" }, goals(3, 1)), "won");
    assert.equal(resolveLegOutcome({ marketType, selectionId: "away_1" }, goals(1, 1)), "won");
  });

  it("settles total corners O/U 10 against 10, not 1.0", () => {
    const marketType = overUnderMarketType("corners", 10)!;
    assert.equal(marketType, "corners_over_under_100");
    assert.equal(resolveLegOutcome(leg(marketType, "over"), finished({ home: 6, away: 4 })), "void");
    assert.equal(resolveLegOutcome(leg(marketType, "over"), finished({ home: 5, away: 4 })), "lost");
    assert.equal(resolveLegOutcome(leg(marketType, "over"), finished({ home: 7, away: 4 })), "won");
  });

  it("settles whole team corners lines", () => {
    const marketType = "team_corners__manchester_city__40";
    assert.equal(resolveLegOutcome(leg(marketType, "over"), finished({ home: 6, away: 4 })), "void");
    assert.equal(resolveLegOutcome(leg(marketType, "under"), finished({ home: 6, away: 3 })), "won");
  });
});
