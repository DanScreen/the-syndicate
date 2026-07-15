import { formatRoundLabel, memberPointsInRound, sortedSettledRounds, CHART_ORIGIN_LABEL, type RoundWithLegs } from "./helpers";

export type MemberSeries = {
  userId: string;
  name: string;
};

export type MemberChartPoint = {
  roundNumber: number;
  label: string;
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
    const point: MemberChartPoint = {
      roundNumber: index + 1,
      label: formatRoundLabel(round, index + 1),
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
  };
  for (const member of members) {
    origin[member.userId] = 0;
  }

  return [origin, ...points];
}
