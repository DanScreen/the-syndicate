/** Per-event market tiers — each tier is one API call (markets × regions credits). */

export const MARKET_TIER_IDS = ["core", "specials"] as const;

export type MarketTierId = (typeof MARKET_TIER_IDS)[number];

export type MarketTierDef = {
  id: MarketTierId;
  label: string;
  description: string;
  marketKeys: readonly string[];
  /** Bookmaker regions for this tier's API call. */
  regions: string;
};

function baseRegions(): string {
  return process.env.ODDS_API_REGIONS ?? "uk";
}

export const MARKET_TIERS: MarketTierDef[] = [
  {
    id: "core",
    label: "Popular extras",
    description: "Both teams to score, double chance, correct score",
    marketKeys: ["btts", "double_chance", "correct_score"],
    regions: baseRegions(),
  },
  {
    id: "specials",
    label: "Corners & cards",
    description: "Corner and card handicaps, totals, to qualify",
    marketKeys: [
      "corners_1x2",
      "to_qualify",
      "alternate_spreads_corners",
      "alternate_totals_corners",
      "alternate_spreads_cards",
      "alternate_team_totals_corners",
      "alternate_totals_cards",
    ],
    regions: baseRegions(),
  },
];

export function getMarketTier(id: MarketTierId): MarketTierDef {
  const tier = MARKET_TIERS.find((t) => t.id === id);
  if (!tier) throw new Error(`Unknown market tier: ${id}`);
  return tier;
}

export function isMarketTierId(value: string): value is MarketTierId {
  return (MARKET_TIER_IDS as readonly string[]).includes(value);
}

/** Rough Odds API credits for one fetch of this tier (markets × regions). */
export function estimateTierCredits(tier: MarketTierDef): number {
  const regionCount = tier.regions.split(",").filter(Boolean).length;
  return tier.marketKeys.length * regionCount;
}

export function tierForMarketType(marketType: string): MarketTierId {
  if (
    marketType === "to_qualify" ||
    marketType === "corners_1x2" ||
    marketType.startsWith("corners_") ||
    marketType.startsWith("cards_") ||
    marketType.startsWith("team_corners__")
  ) {
    return "specials";
  }
  return "core";
}
