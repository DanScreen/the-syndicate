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

/** Best decimal odds first (retail bookmakers only). */
export function sortQuotesByBestOdds(quotes: BookmakerQuote[]): BookmakerQuote[] {
  return filterRetailQuotes(quotes).sort((a, b) => b.odds - a.odds);
}

export function topQuotes(quotes: BookmakerQuote[], limit: number): BookmakerQuote[] {
  return sortQuotesByBestOdds(quotes).slice(0, limit);
}
