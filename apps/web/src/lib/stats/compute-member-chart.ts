import {
  formatBetAxisLabel,
  formatSettledDateLabel,
  memberPointsInRound,
  sortedSettledRounds,
  CHART_ORIGIN_LABEL,
  type RoundWithLegs,
} from "./helpers";

export type MemberSeries = {
  userId: string;
  name: string;
};

export type MemberChartPoint = {
  roundNumber: number;
  /** Unique X-axis category, e.g. "Bet 3" or "Start". */
  label: string;
  /** Settlement date for tooltips; empty at origin. */
  dateLabel: string;
  [userId: string]: number | string;
};

export function computeMemberChart(
  rounds: RoundWithLegs[],
  members: MemberSeries[]
): MemberChartPoint[] {
  const settled = sortedSettledRounds(rounds);
  const cumulative = new Map<string, number>();
  for (const member of members) {
    cumulative.set(member.userId, 0);
  }

  const points = settled.map((round, index) => {
    const roundNumber = index + 1;
    const point: MemberChartPoint = {
      roundNumber,
      label: formatBetAxisLabel(roundNumber),
      dateLabel: formatSettledDateLabel(round.settledAt) ?? "",
    };

    for (const member of members) {
      const hasLeg = round.legs.some((l) => l.userId === member.userId);
      const roundPoints = hasLeg ? memberPointsInRound(round, member.userId) : 0;
      const total = (cumulative.get(member.userId) ?? 0) + roundPoints;
      cumulative.set(member.userId, total);
      point[member.userId] = Number(total.toFixed(2));
    }

    return point;
  });

  if (points.length === 0) return [];

  const origin: MemberChartPoint = {
    roundNumber: 0,
    label: CHART_ORIGIN_LABEL,
    dateLabel: "",
  };
  for (const member of members) {
    origin[member.userId] = 0;
  }

  return [origin, ...points];
}
