import type { BookmakerQuote } from "@tiki-acca/shared";
import type { OddsApiMarket, OddsApiOutcome } from "./api-types";
import { filterRealDeeplinks, isBookmakerHubUrl } from "./betslip-links";

/**
 * Prefer selection → market → event links from The Odds API.
 * Do not fall back to generic football hubs — those are UI-only last resorts
 * in `buildRoundBetslipLinks`, not stored as if they were deeplinks.
 */
export function resolveDeeplink(
  outcome: OddsApiOutcome,
  market: OddsApiMarket,
  bookmakerEventLink?: string | null,
  _bookmakerId?: string
): string | undefined {
  const candidate = outcome.link ?? market.link ?? bookmakerEventLink ?? undefined;
  if (!candidate || isBookmakerHubUrl(candidate)) return undefined;
  return candidate;
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
  return filterRealDeeplinks(links);
}
