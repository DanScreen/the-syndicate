import type { Leg, Round } from "@prisma/client";
import { legPointsForOutcome, type LegOutcome } from "@the-syndicate/shared";

export type RoundWithLegs = Round & { legs: Leg[] };

export function legPoints(leg: Leg): number {
  if (leg.outcome === "pending") return 0;
  return legPointsForOutcome(leg.outcome as LegOutcome, leg.odds);
}

export function roundSortKey(round: Round): number {
  return (round.settledAt ?? round.createdAt).getTime();
}

export function sortedSettledRounds(rounds: RoundWithLegs[]): RoundWithLegs[] {
  return rounds
    .filter((r) => r.status === "settled")
    .sort((a, b) => roundSortKey(a) - roundSortKey(b));
}

export function formatRoundLabel(round: Round, roundNumber: number): string {
  if (round.settledAt) {
    return new Date(round.settledAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  }
  return `Round ${roundNumber}`;
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

function aggregateByKey(legs: Leg[], keyFn: (leg: Leg) => string | null): CategoryAgg[] {
  const map = new Map<string, CategoryAgg>();
  for (const leg of legs) {
    const key = keyFn(leg);
    if (!key) continue;
    const entry = map.get(key) ?? { key, count: 0, points: 0 };
    entry.count += 1;
    entry.points += legPoints(leg);
    map.set(key, entry);
  }
  return [...map.values()];
}

export function favouriteCategory(
  legs: Leg[],
  keyFn: (leg: Leg) => string | null
): string | null {
  const aggs = aggregateByKey(legs, keyFn);
  if (aggs.length === 0) return null;
  return aggs.sort((a, b) => b.count - a.count)[0].key;
}

export function bestWorstCategory(
  legs: Leg[],
  keyFn: (leg: Leg) => string | null,
  minLegs = 3
): { best: string; worst: string } | null {
  const eligible = aggregateByKey(legs, keyFn).filter((a) => a.count >= minLegs);
  if (eligible.length === 0) return null;
  const sorted = [...eligible].sort((a, b) => b.points - a.points);
  return { best: sorted[0].key, worst: sorted[sorted.length - 1].key };
}
