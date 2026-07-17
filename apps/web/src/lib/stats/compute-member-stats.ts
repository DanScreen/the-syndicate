import type { Leg } from "@prisma/client";
import { bestWorstLegHighlights } from "@tiki-acca/shared";
import type { LegHighlight } from "@tiki-acca/shared";
import {
  favouriteCategory,
  bestWorstCategory,
  betTypeForLeg,
  formatBetAxisLabel,
  formatSettledDateLabel,
  legPoints,
  memberPointsInRound,
  roundById,
  sortedSettledRounds,
  CHART_ORIGIN_LABEL,
  teamForLeg,
  type BestWorstInsight,
  type RoundWithLegs,
} from "./helpers";

export type MemberStatsSummary = {
  netPoints: number;
  /** Average points per settled individual leg (won/lost/void). */
  averagePointsPerLeg: number | null;
  legsPlayed: number;
  /** Individual pick win rate: won / (won + lost), voids excluded. */
  winRate: number | null;
  averageOdds: number | null;
  bestLeg: LegHighlight | null;
  worstLeg: LegHighlight | null;
};

export type MemberStatsChartPoint = {
  roundNumber: number;
  label: string;
  dateLabel: string;
  roundPoints: number;
  cumulativePoints: number;
};

export type MemberCategoryStats = {
  favourite: string | null;
  bestWorst: BestWorstInsight | null;
};

export type MemberStatsResult = {
  userId: string;
  summary: MemberStatsSummary;
  chart: MemberStatsChartPoint[];
  competition: MemberCategoryStats;
  market: MemberCategoryStats;
  team: MemberCategoryStats;
};

export function computeMemberStats(
  userId: string,
  rounds: RoundWithLegs[]
): MemberStatsResult {
  const settled = sortedSettledRounds(rounds);
  const roundMap = roundById(settled);
  const legs: Leg[] = [];

  for (const round of settled) {
    for (const leg of round.legs) {
      if (leg.userId === userId) legs.push(leg);
    }
  }

  const settledLegs = legs.filter((l) => l.outcome !== "pending");
  const decidedLegs = settledLegs.filter(
    (l) => l.outcome === "won" || l.outcome === "lost"
  );
  const wonLegs = decidedLegs.filter((l) => l.outcome === "won").length;

  const netPoints = Number(
    settledLegs
      .reduce((sum, leg) => {
        const round = roundMap.get(leg.roundId);
        return sum + (round ? legPoints(leg, round) : leg.pointsAwarded);
      }, 0)
      .toFixed(2)
  );

  let cumulative = 0;
  const chartPoints: MemberStatsChartPoint[] = settled.map((round, index) => {
    const roundNumber = index + 1;
    const roundPoints = memberPointsInRound(round, userId);
    cumulative += roundPoints;
    return {
      roundNumber,
      label: formatBetAxisLabel(roundNumber),
      dateLabel: formatSettledDateLabel(round.settledAt) ?? "",
      roundPoints: Number(roundPoints.toFixed(2)),
      cumulativePoints: Number(cumulative.toFixed(2)),
    };
  });
  const chart: MemberStatsChartPoint[] =
    chartPoints.length === 0
      ? []
      : [
          {
            roundNumber: 0,
            label: CHART_ORIGIN_LABEL,
            dateLabel: "",
            roundPoints: 0,
            cumulativePoints: 0,
          },
          ...chartPoints,
        ];

  const { bestLeg, worstLeg } = bestWorstLegHighlights(legs);

  return {
    userId,
    summary: {
      netPoints,
      averagePointsPerLeg:
        settledLegs.length > 0
          ? Number((netPoints / settledLegs.length).toFixed(2))
          : null,
      legsPlayed: settledLegs.length,
      winRate:
        decidedLegs.length > 0
          ? Number(((wonLegs / decidedLegs.length) * 100).toFixed(1))
          : null,
      averageOdds:
        settledLegs.length > 0
          ? Number(
              (
                settledLegs.reduce((s, l) => s + l.odds, 0) / settledLegs.length
              ).toFixed(2)
            )
          : null,
      bestLeg,
      worstLeg,
    },
    chart,
    competition: {
      favourite: favouriteCategory(legs, roundMap, (l) => l.competition),
      bestWorst: bestWorstCategory(legs, roundMap, (l) => l.competition),
    },
    market: {
      favourite: favouriteCategory(legs, roundMap, betTypeForLeg),
      bestWorst: bestWorstCategory(legs, roundMap, betTypeForLeg),
    },
    team: {
      favourite: favouriteCategory(legs, roundMap, teamForLeg),
      bestWorst: bestWorstCategory(legs, roundMap, teamForLeg),
    },
  };
}
