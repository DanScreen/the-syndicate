import type { BookmakerQuote, Market, MarketSelection } from "@the-syndicate/shared";
import type { OddsApiBookmaker, OddsApiEvent } from "./api-types";
import { isRetailBookmaker } from "./bookmakers";
import { fetchOddsApiEvent } from "./the-odds-api";
import { addQuote, resolveDeeplink } from "./quotes";

function retailBookmakers(bookmakers: OddsApiBookmaker[]): OddsApiBookmaker[] {
  return bookmakers.filter((b) => isRetailBookmaker(b.key));
}

function buildBttsMarket(bookmakers: OddsApiBookmaker[]): Market | null {
  const quoteMap = new Map<string, BookmakerQuote[]>();

  for (const bookmaker of bookmakers) {
    const market = bookmaker.markets.find((m) => m.key === "btts");
    if (!market) continue;

    for (const outcome of market.outcomes) {
      const id = outcome.name.toLowerCase() === "yes" ? "yes" : "no";
      const link = resolveDeeplink(outcome, market, bookmaker.link, bookmaker.key);
      addQuote(quoteMap, id, bookmaker.key, bookmaker.title, outcome.price, link);
    }
  }

  if (quoteMap.size === 0) return null;

  const selections: MarketSelection[] = [
    { id: "yes", label: "Yes", odds: quoteMap.get("yes") ?? [] },
    { id: "no", label: "No", odds: quoteMap.get("no") ?? [] },
  ].filter((s) => s.odds.length > 0);

  if (selections.length === 0) return null;

  return { type: "both_teams_score", label: "Both Teams to Score", selections };
}

function doubleChanceSelectionId(
  outcomeName: string,
  homeTeam: string,
  awayTeam: string
): string | null {
  const lower = outcomeName.toLowerCase();
  const home = homeTeam.toLowerCase();
  const away = awayTeam.toLowerCase();

  const hasHome = lower.includes(home);
  const hasAway = lower.includes(away);
  const hasDraw = lower.includes("draw");

  if (hasHome && hasDraw) return "home_draw";
  if (hasAway && hasDraw) return "draw_away";
  if (hasHome && hasAway) return "home_away";
  return null;
}

function buildDoubleChanceMarket(
  event: OddsApiEvent,
  bookmakers: OddsApiBookmaker[]
): Market | null {
  const quoteMap = new Map<string, BookmakerQuote[]>();

  for (const bookmaker of bookmakers) {
    const market = bookmaker.markets.find((m) => m.key === "double_chance");
    if (!market) continue;

    for (const outcome of market.outcomes) {
      const selectionId = doubleChanceSelectionId(
        outcome.name,
        event.home_team,
        event.away_team
      );
      if (!selectionId) continue;
      const link = resolveDeeplink(outcome, market, bookmaker.link, bookmaker.key);
      addQuote(quoteMap, selectionId, bookmaker.key, bookmaker.title, outcome.price, link);
    }
  }

  if (quoteMap.size === 0) return null;

  const selections: MarketSelection[] = [
    {
      id: "home_draw",
      label: `${event.home_team} or Draw`,
      odds: quoteMap.get("home_draw") ?? [],
    },
    {
      id: "draw_away",
      label: `Draw or ${event.away_team}`,
      odds: quoteMap.get("draw_away") ?? [],
    },
    {
      id: "home_away",
      label: `${event.home_team} or ${event.away_team}`,
      odds: quoteMap.get("home_away") ?? [],
    },
  ].filter((s) => s.odds.length > 0);

  if (selections.length === 0) return null;

  return { type: "double_chance", label: "Double Chance", selections };
}

function buildDrawNoBetMarket(
  event: OddsApiEvent,
  bookmakers: OddsApiBookmaker[]
): Market | null {
  const quoteMap = new Map<string, BookmakerQuote[]>();

  for (const bookmaker of bookmakers) {
    const market = bookmaker.markets.find((m) => m.key === "draw_no_bet");
    if (!market) continue;

    for (const outcome of market.outcomes) {
      let selectionId: string | null = null;
      if (outcome.name === event.home_team) selectionId = "home";
      if (outcome.name === event.away_team) selectionId = "away";
      if (!selectionId) continue;
      const link = resolveDeeplink(outcome, market, bookmaker.link, bookmaker.key);
      addQuote(quoteMap, selectionId, bookmaker.key, bookmaker.title, outcome.price, link);
    }
  }

  if (quoteMap.size === 0) return null;

  const selections: MarketSelection[] = [
    { id: "home", label: event.home_team, odds: quoteMap.get("home") ?? [] },
    { id: "away", label: event.away_team, odds: quoteMap.get("away") ?? [] },
  ].filter((s) => s.odds.length > 0);

  if (selections.length === 0) return null;

  return { type: "draw_no_bet", label: "Draw No Bet", selections };
}

function mapEventToExtendedMarkets(event: OddsApiEvent): Market[] {
  const bookmakers = retailBookmakers(event.bookmakers);
  return [
    buildBttsMarket(bookmakers),
    buildDoubleChanceMarket(event, bookmakers),
    buildDrawNoBetMarket(event, bookmakers),
  ].filter((m): m is Market => m !== null);
}

export async function fetchExtendedMarkets(
  eventId: string,
  sport: string
): Promise<Market[]> {
  const event = await fetchOddsApiEvent(eventId, sport);
  if (!event) return [];
  return mapEventToExtendedMarkets(event);
}
