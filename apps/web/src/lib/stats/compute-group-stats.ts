import {
  formatRoundDateLabel,
  roundAccaDecided,
  roundAccaWon,
  roundGroupPoints,
  roundsForPerformanceStats,
  sortedSettledRounds,
  type RoundWithLegs,
} from "./helpers";
import { computeMemberChart } from "./compute-member-chart";
import {
  CHART_ORIGIN_LABEL,
  formatBetAxisLabel,
  type GroupStatsChartPoint,
  type GroupStatsResponse,
  type MemberSeries,
} from "@tiki-acca/shared";

export function computeGroupStats(
  rounds: RoundWithLegs[],
  members: MemberSeries[] = []
): GroupStatsResponse {
  const performanceRounds = roundsForPerformanceStats(rounds);
  const settled = sortedSettledRounds(rounds);
  const resolvedLegs = performanceRounds.flatMap((r) =>
    r.legs.filter((l) => l.outcome !== "pending")
  );
  const decidedAccas = performanceRounds.filter((r) => roundAccaDecided(r));
  const accaWins = decidedAccas.filter((r) => roundAccaWon(r)).length;

  const accaOdds = settled
    .map((r) => r.combinedOdds)
    .filter((o): o is number => o !== null);

  let cumulativePoints = 0;
  const chartPoints: GroupStatsChartPoint[] = performanceRounds.map((round, index) => {
    const roundNumber = index + 1;
    const roundPoints = roundGroupPoints(round);
    cumulativePoints += roundPoints;
    return {
      roundNumber,
      roundId: round.id,
      label: formatBetAxisLabel(roundNumber),
      dateLabel: formatRoundDateLabel(round),
      roundPoints: Number(roundPoints.toFixed(2)),
      cumulativePoints: Number(cumulativePoints.toFixed(2)),
    };
  });
  const chart: GroupStatsChartPoint[] =
    chartPoints.length === 0
      ? []
      : [
          {
            roundNumber: 0,
            roundId: "",
            label: CHART_ORIGIN_LABEL,
            dateLabel: "",
            roundPoints: 0,
            cumulativePoints: 0,
          },
          ...chartPoints,
        ];

  const netAccaPlGbp = settled.reduce((sum, r) => sum + (r.profitLossGbp ?? 0), 0);

  const activeMembers = members.filter((m) =>
    performanceRounds.some((r) =>
      r.legs.some((l) => l.userId === m.userId && l.outcome !== "pending")
    )
  );

  return {
    summary: {
      totalRounds: settled.length,
      totalBets: resolvedLegs.length,
      averageLegOdds:
        resolvedLegs.length > 0
          ? Number(
              (
                resolvedLegs.reduce((sum, l) => sum + l.odds, 0) / resolvedLegs.length
              ).toFixed(2)
            )
          : null,
      averageAccaOdds:
        accaOdds.length > 0
          ? Number((accaOdds.reduce((sum, o) => sum + o, 0) / accaOdds.length).toFixed(2))
          : null,
      netGroupPoints: Number(
        performanceRounds.reduce((sum, r) => sum + roundGroupPoints(r), 0).toFixed(2)
      ),
      netAccaPlGbp: Number(netAccaPlGbp.toFixed(2)),
      winRate:
        decidedAccas.length > 0
          ? Number(((accaWins / decidedAccas.length) * 100).toFixed(1))
          : null,
    },
    chart,
    members: activeMembers,
    memberChart: computeMemberChart(rounds, activeMembers),
  };
}
