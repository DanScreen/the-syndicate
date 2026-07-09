import type { Leg, Round } from "@prisma/client";

export type RoundWithLegs = Round & { legs: Leg[] };

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
};

function roundSortKey(round: Round): number {
  return (round.settledAt ?? round.createdAt).getTime();
}

function formatRoundLabel(round: Round, roundNumber: number): string {
  if (round.settledAt) {
    return new Date(round.settledAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  }
  return `Round ${roundNumber}`;
}

export function computeGroupStats(rounds: RoundWithLegs[]): GroupStatsResult {
  const settled = rounds
    .filter((r) => r.status === "settled")
    .sort((a, b) => roundSortKey(a) - roundSortKey(b));

  const allLegs = settled.flatMap((r) => r.legs);
  const wonLegs = allLegs.filter((l) => l.outcome === "won");
  const lostLegs = allLegs.filter((l) => l.outcome === "lost");
  const decidedLegs = wonLegs.length + lostLegs.length;

  const accaOdds = settled
    .map((r) => r.combinedOdds)
    .filter((o): o is number => o !== null);

  let cumulativePoints = 0;
  const chart: GroupStatsChartPoint[] = settled.map((round, index) => {
    const roundPoints = round.legs.reduce((sum, leg) => sum + leg.pointsAwarded, 0);
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
      netGroupPoints: Number(allLegs.reduce((sum, l) => sum + l.pointsAwarded, 0).toFixed(2)),
      netAccaPlGbp: Number(netAccaPlGbp.toFixed(2)),
      winRate:
        decidedLegs > 0
          ? Number(((wonLegs.length / decidedLegs) * 100).toFixed(1))
          : null,
    },
    chart,
  };
}
