import type { Market } from "@the-syndicate/shared";
import type { OddsApiBookmaker, OddsApiEvent } from "./api-types";
import { isRetailBookmaker } from "./bookmakers";
import {
  buildAlternateSpreadsMarkets,
  buildAlternateTeamTotalsMarkets,
  buildAlternateTotalsMarkets,
  buildCorrectScoreMarket,
  buildDoubleChanceMarket,
  buildH2hStyleMarket,
  buildYesNoMarket,
} from "./market-builders";
import { getMarketTier, type MarketTierId } from "./market-tiers";

function retailBookmakers(bookmakers: OddsApiBookmaker[]): OddsApiBookmaker[] {
  return bookmakers.filter((b) => isRetailBookmaker(b.key));
}

export function mapEventToExtendedMarkets(
  event: OddsApiEvent,
  tierId: MarketTierId
): Market[] {
  const tier = getMarketTier(tierId);
  const keys = new Set(tier.marketKeys);
  const bookmakers = retailBookmakers(event.bookmakers);

  const markets: (Market | Market[] | null)[] = [];

  if (keys.has("btts")) {
    markets.push(
      buildYesNoMarket(bookmakers, "btts", "both_teams_score", "Both Teams to Score")
    );
  }
  if (keys.has("double_chance")) {
    markets.push(
      buildDoubleChanceMarket(event, bookmakers, "double_chance", "double_chance", "Double Chance")
    );
  }
  if (keys.has("correct_score")) {
    markets.push(
      buildCorrectScoreMarket(bookmakers, "correct_score", "correct_score", "Correct Score")
    );
  }
  if (keys.has("corners_1x2")) {
    markets.push(
      buildH2hStyleMarket(
        event,
        bookmakers,
        "corners_1x2",
        "corners_1x2",
        "Corners 1X2",
        true
      )
    );
  }
  if (keys.has("to_qualify")) {
    markets.push(
      buildH2hStyleMarket(event, bookmakers, "to_qualify", "to_qualify", "To Qualify", false)
    );
  }
  if (keys.has("alternate_spreads_corners")) {
    markets.push(
      ...buildAlternateSpreadsMarkets(
        event,
        bookmakers,
        "alternate_spreads_corners",
        "corners",
        "Corners Handicap"
      )
    );
  }
  if (keys.has("alternate_totals_corners")) {
    markets.push(
      ...buildAlternateTotalsMarkets(
        bookmakers,
        "alternate_totals_corners",
        "corners",
        "Total Corners"
      )
    );
  }
  if (keys.has("alternate_spreads_cards")) {
    markets.push(
      ...buildAlternateSpreadsMarkets(
        event,
        bookmakers,
        "alternate_spreads_cards",
        "cards",
        "Cards Handicap"
      )
    );
  }
  if (keys.has("alternate_team_totals_corners")) {
    markets.push(
      ...buildAlternateTeamTotalsMarkets(
        bookmakers,
        "alternate_team_totals_corners",
        "team_corners",
        "Team Corners"
      )
    );
  }
  if (keys.has("alternate_totals_cards")) {
    markets.push(
      ...buildAlternateTotalsMarkets(bookmakers, "alternate_totals_cards", "cards", "Total Cards")
    );
  }

  return markets.flatMap((m) => (Array.isArray(m) ? m : m ? [m] : []));
}
