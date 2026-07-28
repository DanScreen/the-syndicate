import { isRetailBookmaker } from "./bookmakers";
import type { BookmakerQuote, MarketSelection } from "./types";

export const DEFAULT_ESTIMATED_ODDS_MARGIN = 0;
export const DEFAULT_ESTIMATED_ODDS_MIN_REAL_QUOTES = 1;
export const DEFAULT_ESTIMATED_ODDS_SKIP_AT = 4;

/** Lowest decimal odds The Odds API (and this app) ever represents. */
const MIN_ODDS = 1.01;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

function roundTo2dp(value: number): number {
  return Math.round(value * 100) / 100;
}

export type FillEstimatedQuotesOptions = {
  /**
   * Haircut applied to the median: estimate = median × (1 − margin).
   * 0 (the default) means estimates equal the true median with no reduction.
   */
  margin: number;
  /** Minimum real quotes required before an estimate is produced. */
  minRealQuotes: number;
  /** Skip filling once real-quote count reaches this threshold. Default 4. */
  skipAt?: number;
};

/**
 * Backfill missing bookmaker cells on a thin selection with a haircut-median
 * estimate, so the bookmaker comparison table stays visually full.
 *
 * Pure and side-effect free. Estimated quotes:
 * - are never better than the best real quote (median ≤ max, minus any margin;
 *   they may equal it when margin is 0),
 * - never carry a `link` (no deeplink to a market a bookmaker may not price),
 * - are only synthesised for bookmakers already covering this fixture.
 */
export function fillEstimatedQuotes(
  selection: MarketSelection,
  eventBookmakers: { id: string; name: string }[],
  opts: FillEstimatedQuotesOptions
): MarketSelection {
  const real = realQuotesOnly(selection.odds);
  const skipAt = opts.skipAt ?? DEFAULT_ESTIMATED_ODDS_SKIP_AT;

  if (real.length >= skipAt || real.length < opts.minRealQuotes) {
    return selection;
  }

  const medianOdds = median(real.map((q) => q.odds));
  const estimate = Math.max(MIN_ODDS, roundTo2dp(medianOdds * (1 - opts.margin)));

  const quotedBookmakerIds = new Set(real.map((q) => q.bookmakerId));
  const candidates = eventBookmakers.filter(
    (b) => isRetailBookmaker(b.id) && !quotedBookmakerIds.has(b.id)
  );

  if (candidates.length === 0) return selection;

  const estimatedQuotes: BookmakerQuote[] = candidates.map((b) => ({
    bookmakerId: b.id,
    bookmakerName: b.name,
    odds: estimate,
    estimated: true,
  }));

  return { ...selection, odds: [...selection.odds, ...estimatedQuotes] };
}

function realQuotesOnly(quotes: BookmakerQuote[]): BookmakerQuote[] {
  return quotes.filter((q) => !q.estimated);
}
