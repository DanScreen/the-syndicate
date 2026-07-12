import type { Leg } from "@prisma/client";
import {
  favouriteCategory,
  bestWorstCategory,
  formatRoundLabel,
  memberPointsInRound,
  roundAccaWon,
  roundById,
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
  const roundMap = roundById(settled);
  const legs: Leg[] = [];

  for (const round of settled) {
    const leg = round.legs.find((l) => l.userId === userId);
    if (leg) legs.push(leg);
  }

  const memberRounds = settled.filter((r) => r.legs.some((l) => l.userId === userId));
  const accaWins = memberRounds.filter((r) => roundAccaWon(r)).length;
  const pointsPerRound = memberRounds.map((r) => memberPointsInRound(r, userId));

  let cumulative = 0;
  const chart: MemberStatsChartPoint[] = settled.map((round, index) => {
    const roundPoints = memberPointsInRound(round, userId);
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
      netPoints: Number(pointsPerRound.reduce((s, p) => s + p, 0).toFixed(2)),
      legsPlayed: legs.length,
      winRate:
        memberRounds.length > 0
          ? Number(((accaWins / memberRounds.length) * 100).toFixed(1))
          : null,
      averageOdds:
        legs.length > 0
          ? Number((legs.reduce((s, l) => s + l.odds, 0) / legs.length).toFixed(2))
          : null,
      bestLeg:
        legs.length > 0
          ? Number(Math.max(...legs.map((l) => l.odds)).toFixed(2))
          : null,
      worstLeg:
        legs.length > 0
          ? Number(Math.min(...legs.map((l) => l.odds)).toFixed(2))
          : null,
    },
    chart,
    competition: {
      favourite: favouriteCategory(legs, roundMap, (l) => l.competition),
      bestWorst: bestWorstCategory(legs, roundMap, (l) => l.competition),
    },
    market: {
      favourite: favouriteCategory(legs, roundMap, (l) => l.marketLabel),
      bestWorst: bestWorstCategory(legs, roundMap, (l) => l.marketLabel),
    },
    team: {
      favourite: favouriteCategory(legs, roundMap, teamForLeg),
      bestWorst: bestWorstCategory(legs, roundMap, teamForLeg),
    },
  };
}
