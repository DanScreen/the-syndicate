import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { UserStatsGroupBreakdown, UserStatsResponse } from "./api-types";
import {
  buildShareText,
  CHART_ORIGIN_LABEL,
  filterUserStatsByGroup,
  formatBetAxisLabel,
} from "./stats-display";

const emptyCategory = { favourite: null, bestWorst: null };

function breakdown(groupId: string, netPoints: number): UserStatsGroupBreakdown {
  return {
    groupId,
    groupName: groupId,
    netPoints,
    legsPlayed: 2,
    settledRounds: 2,
    averagePointsPerLeg: netPoints / 2,
    winRate: 50,
    averageOdds: 2,
    competition: { favourite: `${groupId}-comp`, bestWorst: null },
    market: emptyCategory,
    team: emptyCategory,
  };
}

function chartPoint(roundNumber: number, groupId: string, roundPoints: number, roundPlGbp: number) {
  return {
    roundNumber,
    label: formatBetAxisLabel(roundNumber),
    dateLabel: "1 Sept",
    roundPoints,
    cumulativePoints: 0,
    groupId,
    groupName: groupId,
    accaWon: roundPoints > 0,
    roundPlGbp,
  };
}

const stats: UserStatsResponse = {
  summary: {
    groupCount: 2,
    settledRounds: 4,
    legsPlayed: 4,
    netPoints: 3,
    averagePointsPerLeg: 0.75,
    winRate: 50,
    averageOdds: 2,
    netAccaPlGbp: 5,
  },
  chart: [
    chartPoint(0, "", 0, 0),
    chartPoint(1, "a", 2, 10),
    chartPoint(2, "b", -1, -5),
    chartPoint(3, "a", 1.5, 2.5),
  ],
  groups: [breakdown("a", 3.5), breakdown("b", -0.5)],
  competition: emptyCategory,
  market: emptyCategory,
  team: emptyCategory,
};

describe("formatBetAxisLabel", () => {
  it("labels the origin and each bet", () => {
    assert.equal(formatBetAxisLabel(0), CHART_ORIGIN_LABEL);
    assert.equal(formatBetAxisLabel(3), "Bet 3");
  });
});

describe("filterUserStatsByGroup", () => {
  it("returns everything for no group or an unknown group", () => {
    assert.equal(filterUserStatsByGroup(stats, null), stats);
    assert.equal(filterUserStatsByGroup(stats, "missing"), stats);
  });

  it("renumbers the chart and uses the group's breakdown", () => {
    const filtered = filterUserStatsByGroup(stats, "a");
    assert.deepEqual(
      filtered.chart.map((p) => [p.label, p.cumulativePoints]),
      [
        ["Start", 0],
        ["Bet 1", 2],
        ["Bet 2", 3.5],
      ]
    );
    assert.equal(filtered.summary.groupCount, 1);
    assert.equal(filtered.summary.netPoints, 3.5);
    assert.equal(filtered.summary.netAccaPlGbp, 12.5);
    assert.equal(filtered.competition.favourite, "a-comp");
    assert.equal(filtered.groups, stats.groups);
  });
});

describe("buildShareText", () => {
  it("signs points and omits a missing win rate", () => {
    assert.equal(
      buildShareText("Dan", { netPoints: 2.5, legsPlayed: 4, winRate: 50 }),
      "Dan on Tiki Acca\nNet points: +2.50\nLegs: 4\nPick win rate: 50%\nhttps://www.tikiacca.com"
    );
    assert.doesNotMatch(
      buildShareText("Dan", { netPoints: -1, legsPlayed: 1, winRate: null }),
      /win rate/
    );
  });
});
