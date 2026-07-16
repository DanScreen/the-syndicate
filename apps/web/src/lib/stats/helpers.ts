import type { Leg, Round } from "@prisma/client";
import {
  accaSucceeded,
  groupAccaRoundPoints,
  memberAccaLegPoints,
  type LegOutcome,
} from "@tiki-acca/shared";

export type RoundWithLegs = Round & { legs: Leg[] };

export function roundOutcomes(round: RoundWithLegs): LegOutcome[] {
  return round.legs.map((l) => l.outcome as LegOutcome);
}

export function roundGroupPoints(round: RoundWithLegs): number {
  if (round.status !== "settled") return 0;
  return groupAccaRoundPoints(roundOutcomes(round), round.combinedOdds ?? 1);
}

/** Cumulative acca points earned by the group across settled rounds. */
export function groupNetPoints(rounds: RoundWithLegs[]): number {
  const total = sortedSettledRounds(rounds).reduce((sum, round) => sum + roundGroupPoints(round), 0);
  return Number(total.toFixed(2));
}

export function memberPointsInRound(round: RoundWithLegs, userId: string): number {
  if (round.status !== "settled") return 0;
  const outcomes = roundOutcomes(round);
  const total = round.legs
    .filter((l) => l.userId === userId)
    .reduce(
      (sum, leg) =>
        sum +
        memberAccaLegPoints(outcomes, leg.outcome as LegOutcome, leg.odds),
      0
    );
  return Number(total.toFixed(2));
}

export function legPoints(leg: Leg, round?: RoundWithLegs): number {
  if (leg.outcome === "pending") return 0;
  if (round) {
    return memberAccaLegPoints(
      roundOutcomes(round),
      leg.outcome as LegOutcome,
      leg.odds
    );
  }
  return leg.pointsAwarded;
}

export function roundAccaWon(round: RoundWithLegs): boolean {
  if (round.status !== "settled") return false;
  return accaSucceeded(roundOutcomes(round));
}

export function roundById(rounds: RoundWithLegs[]): Map<string, RoundWithLegs> {
  return new Map(rounds.map((r) => [r.id, r]));
}

export function roundSortKey(round: Round): number {
  return (round.settledAt ?? round.createdAt).getTime();
}

export function sortedSettledRounds(rounds: RoundWithLegs[]): RoundWithLegs[] {
  return rounds
    .filter((r) => r.status === "settled")
    .sort((a, b) => roundSortKey(a) - roundSortKey(b));
}

/** X-axis label for the zero baseline prepended to performance chart series. */
export const CHART_ORIGIN_LABEL = "Start";

/** Axis / list label for performance charts — unique per bet (avoids same-day collisions). */
export function formatBetAxisLabel(roundNumber: number): string {
  if (roundNumber === 0) return CHART_ORIGIN_LABEL;
  return `Bet ${roundNumber}`;
}

/** Settlement date for chart tooltips (not used as the X-axis category). */
export function formatSettledDateLabel(
  settledAt: Date | string | null | undefined
): string | null {
  if (!settledAt) return null;
  return new Date(settledAt).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** @deprecated Prefer formatBetAxisLabel + formatSettledDateLabel for charts. */
export function formatRoundLabel(round: Round, roundNumber: number): string {
  return formatBetAxisLabel(roundNumber);
}

/** Sum of recomputed member points across settled rounds (matches Performance UI). */
export function memberNetPointsAcrossRounds(
  rounds: RoundWithLegs[],
  userId: string
): number {
  const total = sortedSettledRounds(rounds).reduce(
    (sum, round) => sum + memberPointsInRound(round, userId),
    0
  );
  return Number(total.toFixed(2));
}

export function teamForLeg(leg: Leg): string | null {
  if (leg.marketType === "both_teams_score") return null;
  if (leg.marketType.startsWith("over_under")) return null;
  if (leg.selectionLabel === leg.homeTeam || leg.selectionLabel === leg.awayTeam) {
    return leg.selectionLabel;
  }
  return null;
}

type CategoryAgg = { key: string; count: number; points: number };

function aggregateByKey(
  legs: Leg[],
  roundMap: Map<string, RoundWithLegs>,
  keyFn: (leg: Leg) => string | null
): CategoryAgg[] {
  const map = new Map<string, CategoryAgg>();
  for (const leg of legs) {
    const key = keyFn(leg);
    if (!key) continue;
    const round = roundMap.get(leg.roundId);
    const entry = map.get(key) ?? { key, count: 0, points: 0 };
    entry.count += 1;
    entry.points += round ? legPoints(leg, round) : leg.pointsAwarded;
    map.set(key, entry);
  }
  return [...map.values()];
}

export function favouriteCategory(
  legs: Leg[],
  roundMap: Map<string, RoundWithLegs>,
  keyFn: (leg: Leg) => string | null
): string | null {
  const aggs = aggregateByKey(legs, roundMap, keyFn);
  if (aggs.length === 0) return null;
  return aggs.sort((a, b) => b.count - a.count)[0].key;
}

export function bestWorstCategory(
  legs: Leg[],
  roundMap: Map<string, RoundWithLegs>,
  keyFn: (leg: Leg) => string | null,
  minLegs = 3
): { best: string; worst: string } | null {
  const eligible = aggregateByKey(legs, roundMap, keyFn).filter((a) => a.count >= minLegs);
  if (eligible.length === 0) return null;
  const sorted = [...eligible].sort((a, b) => b.points - a.points);
  return { best: sorted[0].key, worst: sorted[sorted.length - 1].key };
}
