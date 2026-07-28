import type { BookmakerQuote } from "./types";

/** Exchange / lay-only bookmakers excluded from retail odds display. */
const EXCHANGE_BOOKMAKER_IDS = new Set([
  "betfair_ex_uk",
  "betfair_sb_uk",
  "matchbook",
  "smarkets",
  "betdaq",
  "betfair",
]);

export function isRetailBookmaker(bookmakerId: string): boolean {
  if (EXCHANGE_BOOKMAKER_IDS.has(bookmakerId)) return false;
  if (bookmakerId.includes("_ex_")) return false;
  return true;
}

export function filterRetailQuotes(quotes: BookmakerQuote[]): BookmakerQuote[] {
  return quotes.filter((q) => isRetailBookmaker(q.bookmakerId));
}

/** Real (non-estimated) quotes only. Estimated quotes are display-only context. */
export function realQuotes(quotes: BookmakerQuote[]): BookmakerQuote[] {
  return quotes.filter((q) => !q.estimated);
}

/**
 * Best decimal odds first (retail, real quotes only).
 *
 * This is the seam every money path funnels through — leg creation, round
 * lock, and acca maths. Estimated quotes are excluded here, not merely
 * ranked low, so no consumer of this function can ever stake or settle one.
 */
export function sortQuotesByBestOdds(quotes: BookmakerQuote[]): BookmakerQuote[] {
  return filterRetailQuotes(realQuotes(quotes)).sort((a, b) => b.odds - a.odds);
}

export function topQuotes(quotes: BookmakerQuote[], limit: number): BookmakerQuote[] {
  return sortQuotesByBestOdds(quotes).slice(0, limit);
}

/**
 * Best decimal odds first (retail quotes, estimates included) — for display
 * only. Real quotes win ties against an estimate at the same price.
 */
export function sortQuotesForDisplay(quotes: BookmakerQuote[]): BookmakerQuote[] {
  return filterRetailQuotes(quotes).sort((a, b) => {
    if (b.odds !== a.odds) return b.odds - a.odds;
    const aReal = a.estimated ? 0 : 1;
    const bReal = b.estimated ? 0 : 1;
    return bReal - aReal;
  });
}
