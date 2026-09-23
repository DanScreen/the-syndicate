import {
  formatRoundDateLabel,
  memberPointsInRound,
  roundsForPerformanceStats,
  type RoundWithLegs,
} from "./helpers";
import {
  CHART_ORIGIN_LABEL,
  formatBetAxisLabel,
  type MemberChartPoint,
  type MemberSeries,
} from "@tiki-acca/shared";

export function computeMemberChart(
  rounds: RoundWithLegs[],
  members: MemberSeries[]
): MemberChartPoint[] {
  const performanceRounds = roundsForPerformanceStats(rounds);
  const cumulative = new Map<string, number>();
  for (const member of members) {
    cumulative.set(member.userId, 0);
  }

  const points = performanceRounds.map((round, index) => {
    const roundNumber = index + 1;
    const point: MemberChartPoint = {
      roundNumber,
      label: formatBetAxisLabel(roundNumber),
      dateLabel: formatRoundDateLabel(round),
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
