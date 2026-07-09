import type { BookmakerQuote, Fixture, Market, MarketSelection } from "@the-syndicate/shared";
import { getCached, setCached } from "./cache";

const API_BASE = "https://api.the-odds-api.com/v4";

type OddsApiOutcome = {
  name: string;
  price: number;
  point?: number;
};

type OddsApiMarket = {
  key: string;
  outcomes: OddsApiOutcome[];
};

type OddsApiBookmaker = {
  key: string;
  title: string;
  markets: OddsApiMarket[];
};

type OddsApiEvent = {
  id: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiBookmaker[];
};

function h2hSelectionId(
  outcomeName: string,
  homeTeam: string,
  awayTeam: string
): string | null {
  if (outcomeName === "Draw") return "draw";
  if (outcomeName === homeTeam) return "home";
  if (outcomeName === awayTeam) return "away";
  return null;
}

function totalsSelectionId(outcomeName: string): string | null {
  const lower = outcomeName.toLowerCase();
  if (lower.includes("over")) return "over";
  if (lower.includes("under")) return "under";
  return null;
}

function bttsSelectionId(outcomeName: string): string | null {
  const lower = outcomeName.toLowerCase();
  if (lower === "yes") return "yes";
  if (lower === "no") return "no";
  return null;
}

function addQuote(
  map: Map<string, BookmakerQuote[]>,
  selectionId: string,
  bookmakerId: string,
  bookmakerName: string,
  odds: number
) {
  const quotes = map.get(selectionId) ?? [];
  const existing = quotes.find((q) => q.bookmakerId === bookmakerId);
  if (existing) {
    existing.odds = odds;
    return;
  }
  quotes.push({ bookmakerId, bookmakerName, odds });
  map.set(selectionId, quotes);
}

function buildH2hMarket(
  event: OddsApiEvent,
  bookmakers: OddsApiBookmaker[]
): Market | null {
  const quoteMap = new Map<string, BookmakerQuote[]>();

  for (const bookmaker of bookmakers) {
    const market = bookmaker.markets.find((m) => m.key === "h2h");
    if (!market) continue;

    for (const outcome of market.outcomes) {
      const selectionId = h2hSelectionId(outcome.name, event.home_team, event.away_team);
      if (!selectionId) continue;
      addQuote(quoteMap, selectionId, bookmaker.key, bookmaker.title, outcome.price);
    }
  }

  if (quoteMap.size === 0) return null;

  const selections: MarketSelection[] = [
    {
      id: "home",
      label: event.home_team,
      odds: quoteMap.get("home") ?? [],
    },
    {
      id: "draw",
      label: "Draw",
      odds: quoteMap.get("draw") ?? [],
    },
    {
      id: "away",
      label: event.away_team,
      odds: quoteMap.get("away") ?? [],
    },
  ].filter((s) => s.odds.length > 0);

  if (selections.length === 0) return null;

  return { type: "match_winner", label: "Match Winner", selections };
}

function buildTotalsMarket(bookmakers: OddsApiBookmaker[]): Market | null {
  const quoteMap = new Map<string, BookmakerQuote[]>();

  for (const bookmaker of bookmakers) {
    const market = bookmaker.markets.find(
      (m) => m.key === "totals" && m.outcomes.some((o) => o.point === 2.5)
    );
    if (!market) continue;

    for (const outcome of market.outcomes) {
      if (outcome.point !== 2.5) continue;
      const selectionId = totalsSelectionId(outcome.name);
      if (!selectionId) continue;
      addQuote(quoteMap, selectionId, bookmaker.key, bookmaker.title, outcome.price);
    }
  }

  if (quoteMap.size === 0) return null;

  const selections: MarketSelection[] = [
    { id: "over", label: "Over 2.5", odds: quoteMap.get("over") ?? [] },
    { id: "under", label: "Under 2.5", odds: quoteMap.get("under") ?? [] },
  ].filter((s) => s.odds.length > 0);

  if (selections.length === 0) return null;

  return { type: "over_under_25", label: "Over/Under 2.5 Goals", selections };
}

function buildBttsMarket(bookmakers: OddsApiBookmaker[]): Market | null {
  const quoteMap = new Map<string, BookmakerQuote[]>();

  for (const bookmaker of bookmakers) {
    const market = bookmaker.markets.find((m) => m.key === "btts");
    if (!market) continue;

    for (const outcome of market.outcomes) {
      const selectionId = bttsSelectionId(outcome.name);
      if (!selectionId) continue;
      addQuote(quoteMap, selectionId, bookmaker.key, bookmaker.title, outcome.price);
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

function mapEventToFixture(event: OddsApiEvent): Fixture | null {
  const markets = [
    buildH2hMarket(event, event.bookmakers),
    buildTotalsMarket(event.bookmakers),
    buildBttsMarket(event.bookmakers),
  ].filter((m): m is Market => m !== null);

  if (markets.length === 0) return null;

  return {
    id: event.id,
    homeTeam: event.home_team,
    awayTeam: event.away_team,
    competition: event.sport_title,
    kickoff: event.commence_time,
    markets,
  };
}

export async function fetchOddsApiFixtures(): Promise<Fixture[]> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    throw new Error("ODDS_API_KEY is not configured");
  }

  const sport = process.env.ODDS_API_SPORT ?? "soccer_epl";
  const regions = process.env.ODDS_API_REGIONS ?? "uk";
  const cacheTtlMs = Number(process.env.ODDS_API_CACHE_TTL_MS ?? 600_000);
  const cacheKey = `odds-api:${sport}:${regions}`;

  const cached = getCached<Fixture[]>(cacheKey);
  if (cached) return cached;

  const url = new URL(`${API_BASE}/sports/${sport}/odds`);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("regions", regions);
  url.searchParams.set("markets", "h2h,totals,btts");
  url.searchParams.set("oddsFormat", "decimal");

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`The Odds API error ${res.status}: ${body}`);
  }

  const events = (await res.json()) as OddsApiEvent[];
  const fixtures = events
    .map(mapEventToFixture)
    .filter((f): f is Fixture => f !== null)
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());

  return setCached(cacheKey, fixtures, cacheTtlMs);
}
