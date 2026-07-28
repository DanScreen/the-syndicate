import type { BookmakerQuote } from "@tiki-acca/shared";
import { fillEstimatedQuotes, isRetailBookmaker } from "@tiki-acca/shared";
import { sortQuotesByBestOdds } from "./bookmakers";
import { calculateCombinedOdds } from "./betslip-links";

export type AccaBookmakerResult = {
  bookmakerId: string;
  bookmakerName: string;
  combinedOdds: number;
  /** False when no single bookmaker quotes every leg; combined uses best per-leg odds. */
  singleBookmaker: boolean;
};

export type RankAccaOptions = {
  /**
   * When true, every leg is first filled with a median estimate for every
   * retail bookmaker seen anywhere across the acca, so the ranking lists all of
   * them — not only books that genuinely price every leg. This fabricates
   * fixture coverage for books that don't price a given leg at all; gated by
   * the estimated-odds flag at the (async) call sites.
   */
  expandUniverse?: boolean;
};

/** Retail bookmakers seen anywhere across the acca's legs (real or estimated). */
function accaBookmakerUniverse(
  legs: { quotes: BookmakerQuote[] }[]
): { id: string; name: string }[] {
  const byId = new Map<string, string>();
  for (const leg of legs) {
    for (const q of leg.quotes) {
      if (isRetailBookmaker(q.bookmakerId) && !byId.has(q.bookmakerId)) {
        byId.set(q.bookmakerId, q.bookmakerName);
      }
    }
  }
  return [...byId.entries()].map(([id, name]) => ({ id, name }));
}

/**
 * Fill every leg with a true-median estimate for each universe bookmaker it
 * lacks, so a book present on *any* leg becomes present on *all* legs. Legs
 * with no real quotes are left untouched (nothing to base a median on).
 */
export function expandLegsToUniverse(
  legs: { quotes: BookmakerQuote[] }[]
): { quotes: BookmakerQuote[] }[] {
  const universe = accaBookmakerUniverse(legs);
  return legs.map((leg) => {
    const real = leg.quotes.filter((q) => !q.estimated);
    if (real.length === 0) return leg;
    const filled = fillEstimatedQuotes(
      { id: "acca", label: "acca", odds: real },
      universe,
      { margin: 0, minRealQuotes: 1, skipAt: Number.MAX_SAFE_INTEGER }
    );
    return { ...leg, quotes: filled.odds };
  });
}

/**
 * All retail bookmakers that quote every leg, ranked by combined acca odds (best first).
 */
export function rankAccaBookmakers(
  legs: { quotes: BookmakerQuote[] }[],
  options?: RankAccaOptions
): AccaBookmakerResult[] {
  if (legs.length === 0) return [];

  const workLegs = options?.expandUniverse ? expandLegsToUniverse(legs) : legs;

  const quoteMaps = workLegs.map((leg) => {
    const map = new Map<string, BookmakerQuote>();
    for (const q of sortQuotesByBestOdds(leg.quotes)) {
      if (!map.has(q.bookmakerId)) map.set(q.bookmakerId, q);
    }
    return map;
  });

  let candidates = new Set(quoteMaps[0]!.keys());
  for (const map of quoteMaps.slice(1)) {
    candidates = new Set([...candidates].filter((id) => map.has(id)));
  }

  const ranked: AccaBookmakerResult[] = [];

  for (const bmId of candidates) {
    let combined = 1;
    let name = "";
    for (const map of quoteMaps) {
      const q = map.get(bmId)!;
      combined *= q.odds;
      name = q.bookmakerName;
    }
    ranked.push({
      bookmakerId: bmId,
      bookmakerName: name,
      combinedOdds: Number(combined.toFixed(2)),
      singleBookmaker: true,
    });
  }

  return ranked.sort((a, b) => b.combinedOdds - a.combinedOdds);
}

/**
 * Find the bookmaker with the best combined acca odds across all legs.
 * Only considers retail bookmakers that quote every leg.
 */
export function findBestAccaBookmaker(
  legs: { quotes: BookmakerQuote[] }[],
  options?: RankAccaOptions
): AccaBookmakerResult | null {
  if (legs.length === 0) return null;

  const ranked = rankAccaBookmakers(legs, options);
  if (ranked.length > 0) return ranked[0];

  const bestPerLeg = legs.map((leg) => sortQuotesByBestOdds(leg.quotes)[0]);
  if (bestPerLeg.some((q) => !q)) return null;

  return {
    bookmakerId: bestPerLeg[0]!.bookmakerId,
    bookmakerName: bestPerLeg[0]!.bookmakerName,
    combinedOdds: calculateCombinedOdds(bestPerLeg.map((q) => q!.odds)),
    singleBookmaker: false,
  };
}

export function quoteForBookmaker(
  quotes: BookmakerQuote[],
  bookmakerId: string
): BookmakerQuote | undefined {
  return sortQuotesByBestOdds(quotes).find((q) => q.bookmakerId === bookmakerId);
}
