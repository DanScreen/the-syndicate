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
 * Finds an existing round leg that already uses the same market family on the same fixture.
 * Pass `excludeLegId` when editing so a leg does not conflict with itself.
 */
export function findConflictingMarketLeg(
  existingLegs: ReadonlyArray<MarketConflictLeg>,
  candidate: { fixtureId: string; marketType: string },
  excludeLegId?: string
): MarketConflictLeg | null {
  const family = marketFamilyKey(candidate.marketType);

  for (const leg of existingLegs) {
    if (excludeLegId && leg.id === excludeLegId) continue;
    if (leg.fixtureId !== candidate.fixtureId) continue;
    if (marketFamilyKey(leg.marketType) === family) return leg;
  }

  return null;
}

/** True when a market type conflicts with existing legs on this fixture. */
export function isMarketTakenOnFixture(
  existingLegs: ReadonlyArray<MarketConflictLeg>,
  fixtureId: string,
  marketType: string,
  excludeLegId?: string
): boolean {
  return (
    findConflictingMarketLeg(
      existingLegs,
      { fixtureId, marketType },
      excludeLegId
    ) !== null
  );
}

export function formatMarketConflictError(conflict: MarketConflictLeg): string {
  const fixture =
    conflict.homeTeam && conflict.awayTeam
      ? `${conflict.homeTeam} vs ${conflict.awayTeam}`
      : "this fixture";
  const market = conflict.marketLabel ?? "that market";
  return `This acca already has a ${market} pick on ${fixture}. Choose a different market or fixture — the same market can't be used twice (including other lines like Over 0.5 and Over 1.5).`;
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
