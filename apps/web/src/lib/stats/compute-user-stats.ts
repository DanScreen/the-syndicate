import type { Leg } from "@prisma/client";
import {
  betTypeForLeg,
  bestWorstCategory,
  favouriteCategory,
  formatBetAxisLabel,
  formatSettledDateLabel,
  legPoints,
  memberNetPointsAcrossRounds,
  memberPointsInRound,
  roundAccaWon,
  roundById,
  roundSortKey,
  teamForLeg,
  CHART_ORIGIN_LABEL,
  type BestWorstInsight,
  type RoundWithLegs,
} from "./helpers";

export type UserStatsSummary = {
  groupCount: number;
  settledRounds: number;
  legsPlayed: number;
  netPoints: number;
  averagePointsPerLeg: number | null;
  /** Individual pick win rate: won / (won + lost), voids excluded. */
  winRate: number | null;
  averageOdds: number | null;
  netAccaPlGbp: number;
};

export type UserCategoryStats = {
  favourite: string | null;
  bestWorst: BestWorstInsight | null;
};

export type UserStatsGroupBreakdown = {
  groupId: string;
  groupName: string;
  netPoints: number;
  legsPlayed: number;
  settledRounds: number;
  averagePointsPerLeg: number | null;
  winRate: number | null;
  averageOdds: number | null;
  competition: UserCategoryStats;
  market: UserCategoryStats;
  team: UserCategoryStats;
};

export type UserStatsChartPoint = {
  roundNumber: number;
  label: string;
  dateLabel: string;
  roundPoints: number;
  cumulativePoints: number;
  groupId: string;
  groupName: string;
  accaWon: boolean;
  roundPlGbp: number;
};

export type UserStatsResult = {
  summary: UserStatsSummary;
  chart: UserStatsChartPoint[];
  groups: UserStatsGroupBreakdown[];
  competition: UserCategoryStats;
  market: UserCategoryStats;
  team: UserCategoryStats;
};

type UserRoundEntry = {
  round: RoundWithLegs;
  groupId: string;
  groupName: string;
};

function categoryStats(
  legs: Leg[],
  roundMap: Map<string, RoundWithLegs>
): {
  competition: UserCategoryStats;
  market: UserCategoryStats;
  team: UserCategoryStats;
} {
  return {
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

function individualLegSummary(legs: Leg[], roundMap: Map<string, RoundWithLegs>) {
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

  return {
    legsPlayed: settledLegs.length,
    netPoints,
    averagePointsPerLeg:
      settledLegs.length > 0
        ? Number((netPoints / settledLegs.length).toFixed(2))
        : null,
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
  };
}

export function computeUserStats(
  memberships: {
    groupId: string;
    groupName: string;
    group: { rounds: RoundWithLegs[] };
  }[],
  userId: string
): UserStatsResult {
  const groups: UserStatsGroupBreakdown[] = [];
  const userRoundEntries: UserRoundEntry[] = [];
  const allUserLegs: Leg[] = [];
  const allRounds: RoundWithLegs[] = [];

  for (const membership of memberships) {
    const settledRounds = membership.group.rounds.filter((r) => r.status === "settled");
    const userLegs = settledRounds.flatMap((r) =>
      r.legs.filter((l) => l.userId === userId)
    );
    const participatedRounds = settledRounds.filter((r) =>
      r.legs.some((l) => l.userId === userId)
    );
    const roundMap = roundById(settledRounds);
    const legSummary = individualLegSummary(userLegs, roundMap);
    const categories = categoryStats(userLegs, roundMap);

    groups.push({
      groupId: membership.groupId,
      groupName: membership.groupName,
      netPoints: memberNetPointsAcrossRounds(settledRounds, userId),
      legsPlayed: legSummary.legsPlayed,
      settledRounds: participatedRounds.length,
      averagePointsPerLeg: legSummary.averagePointsPerLeg,
      winRate: legSummary.winRate,
      averageOdds: legSummary.averageOdds,
      ...categories,
    });

    allUserLegs.push(...userLegs);
    allRounds.push(...settledRounds);

    for (const round of participatedRounds) {
      userRoundEntries.push({
        round,
        groupId: membership.groupId,
        groupName: membership.groupName,
      });
    }
  }

  userRoundEntries.sort(
    (a, b) => roundSortKey(a.round) - roundSortKey(b.round)
  );

  let cumulativePoints = 0;
  const chartPoints: UserStatsChartPoint[] = userRoundEntries.map((entry, index) => {
    const roundNumber = index + 1;
    const roundPoints = memberPointsInRound(entry.round, userId);
    cumulativePoints += roundPoints;
    return {
      roundNumber,
      label: formatBetAxisLabel(roundNumber),
      dateLabel: formatSettledDateLabel(entry.round.settledAt) ?? "",
      roundPoints: Number(roundPoints.toFixed(2)),
      cumulativePoints: Number(cumulativePoints.toFixed(2)),
      groupId: entry.groupId,
      groupName: entry.groupName,
      accaWon: roundAccaWon(entry.round),
      roundPlGbp: entry.round.profitLossGbp ?? 0,
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

  const allRoundMap = roundById(allRounds);
  const overall = individualLegSummary(allUserLegs, allRoundMap);
  const overallCategories = categoryStats(allUserLegs, allRoundMap);

  const netAccaPlGbp = userRoundEntries.reduce(
    (sum, e) => sum + (e.round.profitLossGbp ?? 0),
    0
  );

  return {
    summary: {
      groupCount: memberships.length,
      settledRounds: userRoundEntries.length,
      legsPlayed: overall.legsPlayed,
      netPoints: overall.netPoints,
      averagePointsPerLeg: overall.averagePointsPerLeg,
      winRate: overall.winRate,
      averageOdds: overall.averageOdds,
      netAccaPlGbp: Number(netAccaPlGbp.toFixed(2)),
    },
    chart,
    groups: groups.sort((a, b) => b.netPoints - a.netPoints),
    ...overallCategories,
  };
}

export function filterUserStatsByGroup(
  stats: UserStatsResult,
  groupId: string | null
): UserStatsResult {
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
