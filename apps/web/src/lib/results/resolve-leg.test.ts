import assert from "node:assert/strict";
import { describe, it } from "node:test";
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
