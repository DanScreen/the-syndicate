import type { UserStatsChartPoint, UserStatsResponse } from "./api-types";

/** X-axis label for the zero point every performance chart starts from. */
export const CHART_ORIGIN_LABEL = "Start";

/** Axis / list label for performance charts — unique per bet (avoids same-day collisions). */
export function formatBetAxisLabel(roundNumber: number): string {
  if (roundNumber === 0) return CHART_ORIGIN_LABEL;
  return `Bet ${roundNumber}`;
}

/**
 * Narrow cross-group performance to one group: summary and categories come from
 * that group's breakdown, and the chart is re-numbered from that group's bets.
 * `groupId: null` returns the all-groups view unchanged.
 */
export function filterUserStatsByGroup(
  stats: UserStatsResponse,
  groupId: string | null
): UserStatsResponse {
  if (!groupId) return stats;

  const group = stats.groups.find((g) => g.groupId === groupId);
  if (!group) return stats;

  const roundPoints = stats.chart.filter(
    (point) => point.roundNumber > 0 && point.groupId === groupId
  );

  let cumulativePoints = 0;
  const chartPoints: UserStatsChartPoint[] = roundPoints.map((point, index) => {
    const roundNumber = index + 1;
    cumulativePoints += point.roundPoints;
    return {
      ...point,
      roundNumber,
      label: formatBetAxisLabel(roundNumber),
      cumulativePoints: Number(cumulativePoints.toFixed(2)),
    };
  });

  const chart: UserStatsChartPoint[] =
    chartPoints.length === 0
      ? []
      : [
          {
            roundNumber: 0,
            label: CHART_ORIGIN_LABEL,
            dateLabel: "",
            roundPoints: 0,
            cumulativePoints: 0,
            groupId: "",
            groupName: "",
            accaWon: false,
            roundPlGbp: 0,
          },
          ...chartPoints,
        ];

  const netAccaPlGbp = roundPoints.reduce((sum, point) => sum + point.roundPlGbp, 0);

  return {
    summary: {
      groupCount: 1,
      settledRounds: group.settledRounds,
      legsPlayed: group.legsPlayed,
      netPoints: group.netPoints,
      averagePointsPerLeg: group.averagePointsPerLeg,
      winRate: group.winRate,
      averageOdds: group.averageOdds,
      netAccaPlGbp: Number(netAccaPlGbp.toFixed(2)),
    },
    chart,
    groups: stats.groups,
    competition: group.competition,
    market: group.market,
    team: group.team,
  };
}

/** Plain-text performance summary for the share sheet / clipboard. */
export function buildShareText(
  title: string,
  stats: { netPoints: number; legsPlayed: number; winRate: number | null }
): string {
  const lines = [
    `${title} on Tiki Acca`,
    `Net points: ${stats.netPoints >= 0 ? "+" : ""}${stats.netPoints.toFixed(2)}`,
    `Legs: ${stats.legsPlayed}`,
  ];
  if (stats.winRate != null) {
    lines.push(`Pick win rate: ${stats.winRate}%`);
  }
  lines.push("https://www.tikiacca.com");
  return lines.join("\n");
}
