import type { BookmakerQuote, Fixture, Market, MarketSelection } from "@the-syndicate/shared";
import type { OddsApiBookmaker, OddsApiEvent } from "./api-types";
import { isRetailBookmaker } from "./bookmakers";
import { getCached, setCached } from "./cache";
import { addQuote, resolveDeeplink } from "./quotes";

const API_BASE = "https://api.the-odds-api.com/v4";

/** Default competition when ODDS_API_SPORT is unset. */
export const DEFAULT_ODDS_SPORT = "soccer_fifa_world_cup";

/** Markets on the bulk /odds endpoint (btts etc. are per-event only). */
const BULK_SOCCER_MARKETS = "h2h,spreads,totals";

function collectTotalLines(bookmakers: OddsApiBookmaker[]): number[] {
  const lines = new Set<number>();
  for (const bookmaker of bookmakers) {
    for (const market of bookmaker.markets) {
      if (market.key !== "totals") continue;
      for (const outcome of market.outcomes) {
        if (outcome.point !== undefined) lines.add(outcome.point);
      }
    }
  }
  return [...lines].sort((a, b) => a - b);
}

function retailBookmakers(bookmakers: OddsApiBookmaker[]): OddsApiBookmaker[] {
  return bookmakers.filter((b) => isRetailBookmaker(b.key));
}

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

function overUnderType(line: number): string {
  return `over_under_${String(line).replace(".", "")}`;
}

function asianHandicapType(homePoint: number): string {
  const encoded = homePoint < 0 ? `m${String(Math.abs(homePoint)).replace(".", "")}` : String(homePoint).replace(".", "");
  return `asian_handicap_${encoded}`;
}

function buildH2hMarket(event: OddsApiEvent, bookmakers: OddsApiBookmaker[]): Market | null {
  const quoteMap = new Map<string, BookmakerQuote[]>();

  for (const bookmaker of bookmakers) {
    const market = bookmaker.markets.find((m) => m.key === "h2h");
    if (!market) continue;

    for (const outcome of market.outcomes) {
      const selectionId = h2hSelectionId(outcome.name, event.home_team, event.away_team);
      if (!selectionId) continue;
      const link = resolveDeeplink(outcome, market, bookmaker.link, bookmaker.key);
      addQuote(quoteMap, selectionId, bookmaker.key, bookmaker.title, outcome.price, link);
    }
  }

  if (quoteMap.size === 0) return null;

  const selections: MarketSelection[] = [
    { id: "home", label: event.home_team, odds: quoteMap.get("home") ?? [] },
    { id: "draw", label: "Draw", odds: quoteMap.get("draw") ?? [] },
    { id: "away", label: event.away_team, odds: quoteMap.get("away") ?? [] },
  ].filter((s) => s.odds.length > 0);

  if (selections.length === 0) return null;

  return { type: "match_winner", label: "Match Winner", selections };
}

function buildTotalsMarketForLine(
  bookmakers: OddsApiBookmaker[],
  line: number
): Market | null {
  const quoteMap = new Map<string, BookmakerQuote[]>();

  for (const bookmaker of bookmakers) {
    const market = bookmaker.markets.find(
      (m) => m.key === "totals" && m.outcomes.some((o) => o.point === line)
    );
    if (!market) continue;

    for (const outcome of market.outcomes) {
      if (outcome.point !== line) continue;
      const selectionId = totalsSelectionId(outcome.name);
      if (!selectionId) continue;
      const link = resolveDeeplink(outcome, market, bookmaker.link, bookmaker.key);
      addQuote(quoteMap, selectionId, bookmaker.key, bookmaker.title, outcome.price, link);
    }
  }

  if (quoteMap.size === 0) return null;

  const selections: MarketSelection[] = [
    { id: "over", label: `Over ${line}`, odds: quoteMap.get("over") ?? [] },
    { id: "under", label: `Under ${line}`, odds: quoteMap.get("under") ?? [] },
  ].filter((s) => s.odds.length > 0);

  if (selections.length === 0) return null;

  return {
    type: overUnderType(line),
    label: `Over/Under ${line} Goals`,
    selections,
  };
}

function buildTotalsMarkets(bookmakers: OddsApiBookmaker[]): Market[] {
  return collectTotalLines(bookmakers)
    .map((line) => buildTotalsMarketForLine(bookmakers, line))
    .filter((m): m is Market => m !== null);
}

function buildSpreadsMarkets(event: OddsApiEvent, bookmakers: OddsApiBookmaker[]): Market[] {
  const lineMaps = new Map<string, Map<string, BookmakerQuote[]>>();

  for (const bookmaker of bookmakers) {
    const market = bookmaker.markets.find((m) => m.key === "spreads");
    if (!market) continue;

    for (const outcome of market.outcomes) {
      if (outcome.point === undefined) continue;

      const isHome = outcome.name === event.home_team;
      const isAway = outcome.name === event.away_team;
      if (!isHome && !isAway) continue;

      const homePoint = isHome ? outcome.point : -outcome.point;
      const type = asianHandicapType(homePoint);
      const quoteMap = lineMaps.get(type) ?? new Map<string, BookmakerQuote[]>();
      const selectionId = isHome ? `home_${outcome.point}` : `away_${outcome.point}`;
      const link = resolveDeeplink(outcome, market, bookmaker.link, bookmaker.key);
      addQuote(quoteMap, selectionId, bookmaker.key, bookmaker.title, outcome.price, link);
      lineMaps.set(type, quoteMap);
    }
  }

  const markets: Market[] = [];

  for (const [type, quoteMap] of lineMaps) {
    const homePoint = type.includes("m")
      ? -Number(type.replace("asian_handicap_m", "")) / 10
      : Number(type.replace("asian_handicap_", "")) / 10;
    const awayPoint = -homePoint;
    const homeLabel = `${event.home_team} ${homePoint > 0 ? "+" : ""}${homePoint}`;
    const awayLabel = `${event.away_team} ${awayPoint > 0 ? "+" : ""}${awayPoint}`;

    const selections: MarketSelection[] = [
      {
        id: `home_${homePoint}`,
        label: homeLabel,
        odds: quoteMap.get(`home_${homePoint}`) ?? [],
      },
      {
        id: `away_${awayPoint}`,
        label: awayLabel,
        odds: quoteMap.get(`away_${awayPoint}`) ?? [],
      },
    ].filter((s) => s.odds.length > 0);

    if (selections.length === 0) continue;

    markets.push({
      type,
      label: `Asian Handicap ${homePoint > 0 ? "+" : ""}${homePoint}`,
      selections,
    });
  }

  return markets.sort((a, b) => a.label.localeCompare(b.label));
}

function mapEventToFixture(event: OddsApiEvent): Fixture | null {
  const bookmakers = retailBookmakers(event.bookmakers);
  const markets = [
    buildH2hMarket(event, bookmakers),
    ...buildTotalsMarkets(bookmakers),
    ...buildSpreadsMarkets(event, bookmakers),
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

export async function fetchOddsApiFixtures(
  sport: string = process.env.ODDS_API_SPORT ?? DEFAULT_ODDS_SPORT,
  competitionName?: string
): Promise<Fixture[]> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    throw new Error("ODDS_API_KEY is not configured");
  }

  const regions = process.env.ODDS_API_REGIONS ?? "uk";
  const cacheTtlMs = Number(process.env.ODDS_API_CACHE_TTL_MS ?? 600_000);
  const cacheKey = `odds-api:v3:${sport}:${regions}`;

  const cached = getCached<Fixture[]>(cacheKey);
  if (cached) return cached;

  const url = new URL(`${API_BASE}/sports/${sport}/odds`);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("regions", regions);
  url.searchParams.set("markets", BULK_SOCCER_MARKETS);
  url.searchParams.set("oddsFormat", "decimal");
  url.searchParams.set("includeLinks", "true");

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`The Odds API error ${res.status}: ${body}`);
  }

  const events = (await res.json()) as OddsApiEvent[];
  const fixtures = events
    .map((event) => {
      const fixture = mapEventToFixture(event);
      if (!fixture) return null;
      return competitionName ? { ...fixture, competition: competitionName } : fixture;
    })
    .filter((f): f is Fixture => f !== null)
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());

  return setCached(cacheKey, fixtures, cacheTtlMs);
}

export async function fetchOddsApiEvent(
  eventId: string,
  sport: string = process.env.ODDS_API_SPORT ?? DEFAULT_ODDS_SPORT
): Promise<OddsApiEvent | null> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) return null;

  const regions = process.env.ODDS_API_REGIONS ?? "uk";
  const cacheTtlMs = Number(process.env.ODDS_API_CACHE_TTL_MS ?? 600_000);
  const cacheKey = `odds-api-event:v3:${sport}:${regions}:${eventId}`;

  const cached = getCached<OddsApiEvent>(cacheKey);
  if (cached) return cached;

  const url = new URL(`${API_BASE}/sports/${sport}/events/${eventId}/odds`);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("regions", regions);
  url.searchParams.set("markets", "btts,double_chance,draw_no_bet");
  url.searchParams.set("oddsFormat", "decimal");
  url.searchParams.set("includeLinks", "true");

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`The Odds API event error ${res.status}: ${body}`);
  }

  const raw = (await res.json()) as OddsApiEvent | OddsApiEvent[];
  const event = Array.isArray(raw) ? (raw[0] ?? null) : raw;
  if (event?.id) setCached(cacheKey, event, cacheTtlMs);
  return event?.id ? event : null;
}
