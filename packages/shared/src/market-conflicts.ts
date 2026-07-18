import {
  embeddedOverUnderLineFromType,
  handicapLineFromType,
  overUnderLineFromType,
} from "./market-groups";

/**
 * Groups market types that conflict when combined on the same fixture.
 * Different lines of the same market (e.g. Over 0.5 and Over 1.5 goals) share a family.
 */
export function marketFamilyKey(marketType: string): string {
  if (
    overUnderLineFromType(marketType) !== null ||
    handicapLineFromType(marketType) !== null ||
    embeddedOverUnderLineFromType(marketType) !== null
  ) {
    return marketType.replace(/_m?\d+$/, "");
  }
  return marketType;
}

export type MarketConflictLeg = {
  id: string;
  fixtureId: string;
  marketType: string;
  homeTeam?: string;
  awayTeam?: string;
  marketLabel?: string;
  selectionLabel?: string;
};

/**
 * Finds an existing round leg on the candidate fixture.
 * Pass `excludeLegId` when editing so a leg does not conflict with itself.
 *
 * Same-fixture singles cannot be multiplied safely because bookmakers apply
 * correlation-aware bet-builder pricing that our odds feed does not provide.
 */
export function findConflictingFixtureLeg(
  existingLegs: ReadonlyArray<MarketConflictLeg>,
  fixtureId: string,
  excludeLegId?: string
): MarketConflictLeg | null {
  for (const leg of existingLegs) {
    if (excludeLegId && leg.id === excludeLegId) continue;
    if (leg.fixtureId === fixtureId) return leg;
  }

  return null;
}

/** True when another leg already uses this fixture. */
export function isFixtureTaken(
  existingLegs: ReadonlyArray<MarketConflictLeg>,
  fixtureId: string,
  excludeLegId?: string
): boolean {
  return findConflictingFixtureLeg(existingLegs, fixtureId, excludeLegId) !== null;
}

export function formatFixtureConflictError(conflict: MarketConflictLeg): string {
  const fixture =
    conflict.homeTeam && conflict.awayTeam
      ? `${conflict.homeTeam} vs ${conflict.awayTeam}`
      : "this fixture";
  return `This acca already has a pick on ${fixture}. Choose a different fixture — only one leg per match is supported.`;
}

export type MarketRedundancyLeg = MarketConflictLeg & {
  createdAt?: Date | string | null;
};

export type MarketRedundancy = {
  /** Earliest leg kept for this fixture + market family. */
  kept: MarketRedundancyLeg;
  /** Later legs that violate the uniqueness rule. */
  removed: MarketRedundancyLeg[];
  fixtureId: string;
  marketFamily: string;
};

function legSortTime(leg: MarketRedundancyLeg): number {
  if (leg.createdAt) {
    const t = new Date(leg.createdAt).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

/**
 * Finds legs that break the one-market-family-per-fixture rule.
 * Keeps the earliest submitted leg in each family (by `createdAt`, then `id`).
 */
export function findRedundantMarketLegs(
  legs: ReadonlyArray<MarketRedundancyLeg>
): MarketRedundancy[] {
  const sorted = [...legs].sort((a, b) => {
    const byTime = legSortTime(a) - legSortTime(b);
    if (byTime !== 0) return byTime;
    return a.id.localeCompare(b.id);
  });

  const keptByKey = new Map<string, MarketRedundancyLeg>();
  const extrasByKey = new Map<string, MarketRedundancyLeg[]>();

  for (const leg of sorted) {
    const family = marketFamilyKey(leg.marketType);
    const key = `${leg.fixtureId}::${family}`;
    const existing = keptByKey.get(key);
    if (!existing) {
      keptByKey.set(key, leg);
      continue;
    }
    const extras = extrasByKey.get(key) ?? [];
    extras.push(leg);
    extrasByKey.set(key, extras);
  }

  const conflicts: MarketRedundancy[] = [];
  for (const [key, removed] of extrasByKey) {
    if (removed.length === 0) continue;
    const kept = keptByKey.get(key);
    if (!kept) continue;
    const [fixtureId, marketFamily] = key.split("::") as [string, string];
    conflicts.push({ kept, removed, fixtureId, marketFamily });
  }

  return conflicts;
}

/** Flat list of leg ids that should be removed to satisfy the market rule. */
export function redundantMarketLegIds(
  legs: ReadonlyArray<MarketRedundancyLeg>
): string[] {
  return findRedundantMarketLegs(legs).flatMap((c) => c.removed.map((l) => l.id));
}
