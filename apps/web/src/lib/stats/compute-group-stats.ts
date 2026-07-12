import {
  formatRoundLabel,
  memberPointsInRound,
  roundAccaWon,
  roundGroupPoints,
  sortedSettledRounds,
  type RoundWithLegs,
} from "./helpers";
import {
  computeMemberChart,
  type MemberChartPoint,
  type MemberSeries,
} from "./compute-member-chart";

export type GroupStatsSummary = {
  totalRounds: number;
  totalBets: number;
  averageLegOdds: number | null;
  averageAccaOdds: number | null;
  netGroupPoints: number;
  netAccaPlGbp: number;
  winRate: number | null;
};

export type GroupStatsChartPoint = {
  roundNumber: number;
  roundId: string;
  label: string;
  roundPoints: number;
  cumulativePoints: number;
};

export type GroupStatsResult = {
  summary: GroupStatsSummary;
  chart: GroupStatsChartPoint[];
  members: MemberSeries[];
  memberChart: MemberChartPoint[];
};

export function computeGroupStats(
  rounds: RoundWithLegs[],
  members: MemberSeries[] = []
): GroupStatsResult {
  const settled = sortedSettledRounds(rounds);
  const allLegs = settled.flatMap((r) => r.legs);
  const accaWins = settled.filter((r) => roundAccaWon(r)).length;
  const accaLosses = settled.length - accaWins;
  const decidedAccas = accaWins + accaLosses;

  const accaOdds = settled
    .map((r) => r.combinedOdds)
    .filter((o): o is number => o !== null);

  let cumulativePoints = 0;
  const chart: GroupStatsChartPoint[] = settled.map((round, index) => {
    const roundPoints = roundGroupPoints(round);
    cumulativePoints += roundPoints;
    return {
      roundNumber: index + 1,
      roundId: round.id,
      label: formatRoundLabel(round, index + 1),
      roundPoints: Number(roundPoints.toFixed(2)),
      cumulativePoints: Number(cumulativePoints.toFixed(2)),
    };
  });

  const netAccaPlGbp = settled.reduce((sum, r) => sum + (r.profitLossGbp ?? 0), 0);

  const activeMembers = members.filter((m) =>
    allLegs.some((l) => l.userId === m.userId)
  );

  return {
    summary: {
      totalRounds: settled.length,
      totalBets: allLegs.length,
      averageLegOdds:
        allLegs.length > 0
          ? Number(
              (allLegs.reduce((sum, l) => sum + l.odds, 0) / allLegs.length).toFixed(2)
            )
          : null,
      averageAccaOdds:
        accaOdds.length > 0
          ? Number((accaOdds.reduce((sum, o) => sum + o, 0) / accaOdds.length).toFixed(2))
          : null,
      netGroupPoints: Number(
        settled.reduce((sum, r) => sum + roundGroupPoints(r), 0).toFixed(2)
      ),
      netAccaPlGbp: Number(netAccaPlGbp.toFixed(2)),
      winRate:
        decidedAccas > 0
          ? Number(((accaWins / decidedAccas) * 100).toFixed(1))
          : null,
    },
    chart,
    members: activeMembers,
    memberChart: computeMemberChart(rounds, activeMembers),
  };
}
