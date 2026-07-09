import {
  formatRoundLabel,
  legPoints,
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
  const wonLegs = allLegs.filter((l) => l.outcome === "won");
  const lostLegs = allLegs.filter((l) => l.outcome === "lost");
  const decidedLegs = wonLegs.length + lostLegs.length;

  const accaOdds = settled
    .map((r) => r.combinedOdds)
    .filter((o): o is number => o !== null);

  let cumulativePoints = 0;
  const chart: GroupStatsChartPoint[] = settled.map((round, index) => {
    const roundPoints = round.legs.reduce((sum, leg) => sum + legPoints(leg), 0);
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
      netGroupPoints: Number(allLegs.reduce((sum, l) => sum + legPoints(l), 0).toFixed(2)),
      netAccaPlGbp: Number(netAccaPlGbp.toFixed(2)),
      winRate:
        decidedLegs > 0
          ? Number(((wonLegs.length / decidedLegs) * 100).toFixed(1))
          : null,
    },
    chart,
    members: activeMembers,
    memberChart: computeMemberChart(rounds, activeMembers),
  };
}
