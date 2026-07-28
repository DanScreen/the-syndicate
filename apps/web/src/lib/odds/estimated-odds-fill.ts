import { fillEstimatedQuotes } from "@tiki-acca/shared";
import type { Market } from "@tiki-acca/shared";
import { estimatedOddsMargin, estimatedOddsMinRealQuotes, estimatedOddsSkipAt } from "./config";

/**
 * Apply the estimated-odds fill to every selection in a set of markets, using
 * the same candidate set (fixture-covering retail bookmakers) for every
 * selection in a market. Called at market-build time (write path) so DB
 * snapshots carry flagged estimates and web + mobile render identically from
 * the store. See docs/specs/estimated-odds-fill.md.
 */
export function fillMarketsWithEstimates(
  markets: Market[],
  eventBookmakers: { id: string; name: string }[]
): Market[] {
  const opts = {
    margin: estimatedOddsMargin(),
    minRealQuotes: estimatedOddsMinRealQuotes(),
    skipAt: estimatedOddsSkipAt(),
  };

  return markets.map((market) => ({
    ...market,
    selections: market.selections.map((selection) =>
      fillEstimatedQuotes(selection, eventBookmakers, opts)
    ),
  }));
}
