import type { BookmakerQuote } from "@the-syndicate/shared";
import type { OddsApiMarket, OddsApiOutcome } from "./api-types";
import { bookmakerHubUrl } from "./betslip-links";

export function resolveDeeplink(
  outcome: OddsApiOutcome,
  market: OddsApiMarket,
  bookmakerEventLink?: string | null,
  bookmakerId?: string
): string | undefined {
  const hub = bookmakerId ? bookmakerHubUrl(bookmakerId) : undefined;
  return outcome.link ?? market.link ?? bookmakerEventLink ?? hub ?? undefined;
}

export function addQuote(
  map: Map<string, BookmakerQuote[]>,
  selectionId: string,
  bookmakerId: string,
  bookmakerName: string,
  odds: number,
  link?: string
) {
  const quotes = map.get(selectionId) ?? [];
  const existing = quotes.find((q) => q.bookmakerId === bookmakerId);
  if (existing) {
    existing.odds = odds;
    if (link) existing.link = link;
    return;
  }
  quotes.push({ bookmakerId, bookmakerName, odds, ...(link ? { link } : {}) });
  map.set(selectionId, quotes);
}

export function bookmakerLinksFromQuotes(quotes: BookmakerQuote[]): Record<string, string> {
  const links: Record<string, string> = {};
  for (const quote of quotes) {
    if (quote.link) links[quote.bookmakerId] = quote.link;
  }
  return links;
}
