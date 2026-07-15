import {
  formatBetAxisLabel,
  formatSettledDateLabel,
  memberPointsInRound,
  roundAccaWon,
  roundSortKey,
  CHART_ORIGIN_LABEL,
  type RoundWithLegs,
} from "./helpers";

export type UserStatsSummary = {
  groupCount: number;
  settledRounds: number;
  legsPlayed: number;
  netPoints: number;
  winRate: number | null;
  netAccaPlGbp: number;
};

export type UserStatsGroupBreakdown = {
  groupId: string;
  groupName: string;
  netPoints: number;
  legsPlayed: number;
  settledRounds: number;
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
};

type UserRoundEntry = {
  round: RoundWithLegs;
  groupId: string;
  groupName: string;
  userLeg: RoundWithLegs["legs"][number];
};

export function computeUserStats(
  memberships: {
    groupId: string;
    groupName: string;
    points: number;
    group: { rounds: RoundWithLegs[] };
  }[],
  userId: string
): UserStatsResult {
  const groups: UserStatsGroupBreakdown[] = [];
  const userRoundEntries: UserRoundEntry[] = [];

  for (const membership of memberships) {
    const settledRounds = membership.group.rounds.filter((r) => r.status === "settled");
    const userLegs = settledRounds.flatMap((r) =>
      r.legs.filter((l) => l.userId === userId)
    );

    groups.push({
      groupId: membership.groupId,
      groupName: membership.groupName,
      netPoints: Number(membership.points.toFixed(2)),
      legsPlayed: userLegs.length,
      settledRounds: settledRounds.filter((r) =>
        r.legs.some((l) => l.userId === userId)
      ).length,
    });

    for (const round of settledRounds) {
      const userLeg = round.legs.find((l) => l.userId === userId);
      if (userLeg) {
        userRoundEntries.push({
          round,
          groupId: membership.groupId,
          groupName: membership.groupName,
          userLeg,
        });
      }
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

  const allUserLegs = userRoundEntries.map((e) => e.userLeg);

  const accaWins = userRoundEntries.filter((e) => roundAccaWon(e.round)).length;

  const netAccaPlGbp = userRoundEntries.reduce(
    (sum, e) => sum + (e.round.profitLossGbp ?? 0),
    0
  );

  return {
    summary: {
      groupCount: memberships.length,
      settledRounds: userRoundEntries.length,
      legsPlayed: allUserLegs.length,
      netPoints: Number(
        userRoundEntries
          .reduce((sum, e) => sum + memberPointsInRound(e.round, userId), 0)
          .toFixed(2)
      ),
      winRate:
        userRoundEntries.length > 0
          ? Number(((accaWins / userRoundEntries.length) * 100).toFixed(1))
          : null,
      netAccaPlGbp: Number(netAccaPlGbp.toFixed(2)),
    },
    chart,
    groups: groups.sort((a, b) => b.netPoints - a.netPoints),
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

  const accaWins = roundPoints.filter((point) => point.accaWon).length;
  const netAccaPlGbp = roundPoints.reduce((sum, point) => sum + point.roundPlGbp, 0);

  return {
    summary: {
      groupCount: 1,
      settledRounds: group.settledRounds,
      legsPlayed: group.legsPlayed,
      netPoints: group.netPoints,
      winRate:
        roundPoints.length > 0
          ? Number(((accaWins / roundPoints.length) * 100).toFixed(1))
          : null,
      netAccaPlGbp: Number(netAccaPlGbp.toFixed(2)),
    },
    chart,
    groups: stats.groups,
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
    lines.push(`Win rate: ${stats.winRate}%`);
  }
  lines.push("https://www.tikiacca.com");
  return lines.join("\n");
}
