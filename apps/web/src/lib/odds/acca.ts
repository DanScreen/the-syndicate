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
 * Find the bookmaker with the best combined acca odds across all legs.
 * Only considers retail bookmakers that quote every leg.
 */
export function findBestAccaBookmaker(
  legs: { quotes: BookmakerQuote[] }[]
): AccaBookmakerResult | null {
  if (legs.length === 0) return null;

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

  if (candidates.size > 0) {
    let best: AccaBookmakerResult | null = null;

    for (const bmId of candidates) {
      let combined = 1;
      let name = "";
      for (const map of quoteMaps) {
        const q = map.get(bmId)!;
        combined *= q.odds;
        name = q.bookmakerName;
      }
      const combinedOdds = Number(combined.toFixed(2));
      if (!best || combinedOdds > best.combinedOdds) {
        best = {
          bookmakerId: bmId,
          bookmakerName: name,
          combinedOdds,
          singleBookmaker: true,
        };
      }
    }

    return best;
  }

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
