import type { Leg } from "@prisma/client";
import {
  favouriteCategory,
  bestWorstCategory,
  formatRoundLabel,
  legPoints,
  sortedSettledRounds,
  teamForLeg,
  type RoundWithLegs,
} from "./helpers";

export type MemberStatsSummary = {
  netPoints: number;
  legsPlayed: number;
  winRate: number | null;
  averageOdds: number | null;
  bestLeg: number | null;
  worstLeg: number | null;
};

export type MemberStatsChartPoint = {
  roundNumber: number;
  label: string;
  roundPoints: number;
  cumulativePoints: number;
};

export type MemberCategoryStats = {
  favourite: string | null;
  bestWorst: { best: string; worst: string } | null;
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
  const legs: Leg[] = [];

  for (const round of settled) {
    const leg = round.legs.find((l) => l.userId === userId);
    if (leg) legs.push(leg);
  }

  const won = legs.filter((l) => l.outcome === "won");
  const lost = legs.filter((l) => l.outcome === "lost");
  const decided = won.length + lost.length;
  const pointsPerLeg = legs.map((l) => legPoints(l));

  let cumulative = 0;
  const chart: MemberStatsChartPoint[] = settled.map((round, index) => {
    const leg = round.legs.find((l) => l.userId === userId);
    const roundPoints = leg ? legPoints(leg) : 0;
    cumulative += roundPoints;
    return {
      roundNumber: index + 1,
      label: formatRoundLabel(round, index + 1),
      roundPoints: Number(roundPoints.toFixed(2)),
      cumulativePoints: Number(cumulative.toFixed(2)),
    };
  });

  return {
    userId,
    summary: {
      netPoints: Number(pointsPerLeg.reduce((s, p) => s + p, 0).toFixed(2)),
      legsPlayed: legs.length,
      winRate:
        decided > 0 ? Number(((won.length / decided) * 100).toFixed(1)) : null,
      averageOdds:
        legs.length > 0
          ? Number((legs.reduce((s, l) => s + l.odds, 0) / legs.length).toFixed(2))
          : null,
      bestLeg: pointsPerLeg.length > 0 ? Math.max(...pointsPerLeg) : null,
      worstLeg: pointsPerLeg.length > 0 ? Math.min(...pointsPerLeg) : null,
    },
    chart,
    competition: {
      favourite: favouriteCategory(legs, (l) => l.competition),
      bestWorst: bestWorstCategory(legs, (l) => l.competition),
    },
    market: {
      favourite: favouriteCategory(legs, (l) => l.marketLabel),
      bestWorst: bestWorstCategory(legs, (l) => l.marketLabel),
    },
    team: {
      favourite: favouriteCategory(legs, teamForLeg),
      bestWorst: bestWorstCategory(legs, teamForLeg),
    },
  };
}
