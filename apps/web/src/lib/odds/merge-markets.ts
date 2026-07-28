import type { BookmakerQuote, Market, MarketSelection } from "@tiki-acca/shared";

/**
 * A real quote always beats an estimate for the same bookmaker, regardless of
 * price — estimates are display-only filler and must never survive a merge
 * once a real price shows up (e.g. a fresh per-event fetch replacing a stale
 * bulk-feed estimate). Between two quotes of the same realness, the better
 * price wins, matching pre-estimate behaviour exactly.
 */
function betterQuote(existing: BookmakerQuote, incoming: BookmakerQuote): BookmakerQuote {
  const existingReal = !existing.estimated;
  const incomingReal = !incoming.estimated;
  if (existingReal !== incomingReal) return incomingReal ? incoming : existing;
  return incoming.odds > existing.odds ? incoming : existing;
}

function mergeQuotes(
  primary: BookmakerQuote[],
  additional: BookmakerQuote[]
): BookmakerQuote[] {
  const byBookmaker = new Map<string, BookmakerQuote>();

  for (const quote of [...primary, ...additional]) {
    const existing = byBookmaker.get(quote.bookmakerId);
    if (!existing) {
      byBookmaker.set(quote.bookmakerId, { ...quote });
      continue;
    }

    const best = betterQuote(existing, quote);
    byBookmaker.set(
      quote.bookmakerId,
      best.estimated
        ? { ...best, link: undefined }
        : { ...best, link: best.link ?? existing.link ?? quote.link }
    );
  }

  return [...byBookmaker.values()].sort((a, b) => b.odds - a.odds);
}

function mergeSelections(
  primary: MarketSelection[],
  additional: MarketSelection[]
): MarketSelection[] {
  const byId = new Map(
    primary.map((selection) => [
      selection.id,
      { ...selection, odds: [...selection.odds] },
    ])
  );

  for (const selection of additional) {
    const existing = byId.get(selection.id);
    if (!existing) {
      byId.set(selection.id, { ...selection, odds: [...selection.odds] });
      continue;
    }

    byId.set(selection.id, {
      ...existing,
      odds: mergeQuotes(existing.odds, selection.odds),
    });
  }

  return [...byId.values()];
}

/**
 * Merge matching markets from separate Odds API feeds.
 *
 * Featured and alternate totals can represent the same exact line while
 * carrying different bookmaker coverage. Keep one market and combine its
 * quotes instead of letting one feed replace the other.
 */
export function mergeMarketCollections(
  primary: Market[],
  additional: Market[]
): Market[] {
  const byType = new Map(
    primary.map((market) => [
      market.type,
      {
        ...market,
        selections: market.selections.map((selection) => ({
          ...selection,
          odds: [...selection.odds],
        })),
      },
    ])
  );

  for (const market of additional) {
    const existing = byType.get(market.type);
    if (!existing) {
      byType.set(market.type, {
        ...market,
        selections: market.selections.map((selection) => ({
          ...selection,
          odds: [...selection.odds],
        })),
      });
      continue;
    }

    byType.set(market.type, {
      ...existing,
      selections: mergeSelections(existing.selections, market.selections),
    });
  }

  return [...byType.values()];
}
