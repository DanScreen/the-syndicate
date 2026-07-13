import {
  formatRoundLabel,
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
  roundPoints: number;
  cumulativePoints: number;
  groupName: string;
};

export type UserStatsResult = {
  summary: UserStatsSummary;
  chart: UserStatsChartPoint[];
  groups: UserStatsGroupBreakdown[];
};

type UserRoundEntry = {
  round: RoundWithLegs;
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
    const roundPoints = memberPointsInRound(entry.round, userId);
    cumulativePoints += roundPoints;
    return {
      roundNumber: index + 1,
      label: formatRoundLabel(entry.round, index + 1),
      roundPoints: Number(roundPoints.toFixed(2)),
      cumulativePoints: Number(cumulativePoints.toFixed(2)),
      groupName: entry.groupName,
    };
  });
  const chart: UserStatsChartPoint[] =
    chartPoints.length === 0
      ? []
      : [
          {
            roundNumber: 0,
            label: CHART_ORIGIN_LABEL,
            roundPoints: 0,
            cumulativePoints: 0,
            groupName: "",
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

export function buildShareText(
  title: string,
  stats: { netPoints: number; legsPlayed: number; winRate: number | null }
): string {
  const lines = [
    `${title} on The Syndicate`,
    `Net points: ${stats.netPoints >= 0 ? "+" : ""}${stats.netPoints.toFixed(2)}`,
    `Legs: ${stats.legsPlayed}`,
  ];
  if (stats.winRate != null) {
    lines.push(`Win rate: ${stats.winRate}%`);
  }
  lines.push("https://www.the-syndicate.uk");
  return lines.join("\n");
}
