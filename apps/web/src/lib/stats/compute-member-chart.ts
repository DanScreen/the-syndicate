import { formatRoundLabel, legPoints, sortedSettledRounds, type RoundWithLegs } from "./helpers";

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

  return settled.map((round, index) => {
    const point: MemberChartPoint = {
      roundNumber: index + 1,
      label: formatRoundLabel(round, index + 1),
    };

    for (const member of members) {
      const leg = round.legs.find((l) => l.userId === member.userId);
      const roundPoints = leg ? legPoints(leg) : 0;
      const total = (cumulative.get(member.userId) ?? 0) + roundPoints;
      cumulative.set(member.userId, total);
      point[member.userId] = Number(total.toFixed(2));
    }

    return point;
  });
}
