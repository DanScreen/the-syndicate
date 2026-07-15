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
