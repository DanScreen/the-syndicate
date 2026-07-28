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
 * Best decimal odds first (retail quotes, estimates included).
 *
 * This is the seam every path funnels through — leg creation, round lock,
 * acca maths and display. Estimated quotes participate here: a real quote
 * still wins ties against an estimate at the same price, so a leg locks at a
 * real bookmaker's price whenever one matches the best odds; an estimate is
 * only ever picked when no real quote sits at that price.
 */
export function sortQuotesByBestOdds(quotes: BookmakerQuote[]): BookmakerQuote[] {
  return filterRetailQuotes(quotes).sort((a, b) => {
    if (b.odds !== a.odds) return b.odds - a.odds;
    const aReal = a.estimated ? 0 : 1;
    const bReal = b.estimated ? 0 : 1;
    return bReal - aReal;
  });
}

export function topQuotes(quotes: BookmakerQuote[], limit: number): BookmakerQuote[] {
  return sortQuotesByBestOdds(quotes).slice(0, limit);
}

/** Alias retained for display call sites; identical to {@link sortQuotesByBestOdds}. */
export function sortQuotesForDisplay(quotes: BookmakerQuote[]): BookmakerQuote[] {
  return sortQuotesByBestOdds(quotes);
}
