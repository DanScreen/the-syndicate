import type { BookmakerQuote } from "@the-syndicate/shared";
import { sortQuotesByBestOdds } from "./bookmakers";
import { calculateCombinedOdds } from "./betslip-links";

export type AccaBookmakerResult = {
  bookmakerId: string;
  bookmakerName: string;
  combinedOdds: number;
  /** False when no single bookmaker quotes every leg; combined uses best per-leg odds. */
  singleBookmaker: boolean;
};

/**
 * All retail bookmakers that quote every leg, ranked by combined acca odds (best first).
 */
export function rankAccaBookmakers(
  legs: { quotes: BookmakerQuote[] }[]
): AccaBookmakerResult[] {
  if (legs.length === 0) return [];

  const quoteMaps = legs.map((leg) => {
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
  legs: { quotes: BookmakerQuote[] }[]
): AccaBookmakerResult | null {
  if (legs.length === 0) return null;

  const ranked = rankAccaBookmakers(legs);
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
