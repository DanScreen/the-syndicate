import type { BookmakerQuote, Market, MarketSelection } from "@tiki-acca/shared";
import type { OddsApiBookmaker, OddsApiEvent, OddsApiMarket, OddsApiOutcome } from "./api-types";
import { addQuote, resolveDeeplink } from "./quotes";

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function lineKey(line: number): string {
  if (line < 0) return `m${String(Math.abs(line)).replace(".", "")}`;
  return String(line).replace(".", "");
}

export function overUnderMarketType(prefix: string, line: number): string {
  const key = lineKey(line);
  if (!prefix) return `over_under_${key}`;
  return `${prefix}_over_under_${key}`;
}

export function handicapMarketType(prefix: string, homePoint: number): string {
  return `${prefix}_handicap_${lineKey(homePoint)}`;
}

function isYes(name: string): boolean {
  return name.trim().toLowerCase() === "yes";
}

function isNo(name: string): boolean {
  return name.trim().toLowerCase() === "no";
}

function isOver(name: string): boolean {
  return name.trim().toLowerCase().includes("over");
}

function isUnder(name: string): boolean {
  return name.trim().toLowerCase().includes("under");
}

function playerNameFromOutcome(outcome: OddsApiOutcome): string | null {
  const name = outcome.name.trim();
  const description = outcome.description?.trim();

  if (description && (isYes(name) || isNo(name) || isOver(name) || isUnder(name))) {
    return description;
  }
  if (isYes(description ?? "") || isNo(description ?? "")) {
    return name;
  }
  if (!isYes(name) && !isNo(name) && !isOver(name) && !isUnder(name)) {
    return name;
  }
  return null;
}

function selectionSideFromOutcome(outcome: OddsApiOutcome): "yes" | "no" | "over" | "under" | null {
  const name = outcome.name.trim().toLowerCase();
  const description = outcome.description?.trim().toLowerCase();

  if (isYes(name) || isYes(description ?? "")) return "yes";
  if (isNo(name) || isNo(description ?? "")) return "no";
  if (isOver(name)) return "over";
  if (isUnder(name)) return "under";
  return null;
}

function addOutcomeQuote(
  quoteMap: Map<string, BookmakerQuote[]>,
  selectionId: string,
  bookmaker: OddsApiBookmaker,
  market: OddsApiMarket,
  outcome: OddsApiOutcome
) {
  const link = resolveDeeplink(outcome, market, bookmaker.link, bookmaker.key);
  addQuote(quoteMap, selectionId, bookmaker.key, bookmaker.title, outcome.price, link);
}

function marketFromQuoteMap(
  type: string,
  label: string,
  quoteMap: Map<string, BookmakerQuote[]>,
  selectionDefs: { id: string; label: string }[]
): Market | null {
  if (quoteMap.size === 0) return null;

  const selections: MarketSelection[] = selectionDefs
    .map((def) => ({
      id: def.id,
      label: def.label,
      odds: quoteMap.get(def.id) ?? [],
    }))
    .filter((s) => s.odds.length > 0);

  if (selections.length === 0) return null;
  return { type, label, selections };
}

export function buildYesNoMarket(
  bookmakers: OddsApiBookmaker[],
  apiKey: string,
  internalType: string,
  label: string
): Market | null {
  const quoteMap = new Map<string, BookmakerQuote[]>();

  for (const bookmaker of bookmakers) {
    const market = bookmaker.markets.find((m) => m.key === apiKey);
    if (!market) continue;

    for (const outcome of market.outcomes) {
      const side = selectionSideFromOutcome(outcome);
      if (side !== "yes" && side !== "no") continue;
      addOutcomeQuote(quoteMap, side, bookmaker, market, outcome);
    }
  }

  return marketFromQuoteMap(internalType, label, quoteMap, [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" },
  ]);
}

export function buildPlayerYesNoMarkets(
  bookmakers: OddsApiBookmaker[],
  apiKey: string,
  marketLabel: string
): Market[] {
  const byPlayer = new Map<string, Map<string, BookmakerQuote[]>>();

  for (const bookmaker of bookmakers) {
    const market = bookmaker.markets.find((m) => m.key === apiKey);
    if (!market) continue;

    for (const outcome of market.outcomes) {
      const player = playerNameFromOutcome(outcome);
      const side = selectionSideFromOutcome(outcome);
      if (!player || (side !== "yes" && side !== "no")) continue;

      const playerKey = slugify(player);
      const quoteMap = byPlayer.get(playerKey) ?? new Map<string, BookmakerQuote[]>();
      addOutcomeQuote(quoteMap, side, bookmaker, market, outcome);
      byPlayer.set(playerKey, quoteMap);
    }
  }

  const markets: Market[] = [];
  for (const [playerKey, quoteMap] of byPlayer) {
    const playerLabel = playerKey.replace(/_/g, " ");
    const market = marketFromQuoteMap(
      `${apiKey}__${playerKey}`,
      `${capitalizeWords(playerLabel)} — ${marketLabel}`,
      quoteMap,
      [
        { id: "yes", label: "Yes" },
        { id: "no", label: "No" },
      ]
    );
    if (market) markets.push(market);
  }

  return markets.sort((a, b) => a.label.localeCompare(b.label));
}

export function buildPlayerOverUnderMarkets(
  bookmakers: OddsApiBookmaker[],
  apiKey: string,
  statLabel: string
): Market[] {
  const byMarketKey = new Map<string, Map<string, BookmakerQuote[]>>();
  const meta = new Map<string, { player: string; line: number }>();

  for (const bookmaker of bookmakers) {
    const market = bookmaker.markets.find((m) => m.key === apiKey);
    if (!market) continue;

    for (const outcome of market.outcomes) {
      const player = playerNameFromOutcome(outcome);
      const side = selectionSideFromOutcome(outcome);
      if (!player || (side !== "over" && side !== "under") || outcome.point === undefined) continue;

      const playerKey = slugify(player);
      const marketKey = `${playerKey}__${lineKey(outcome.point)}`;
      const quoteMap = byMarketKey.get(marketKey) ?? new Map<string, BookmakerQuote[]>();
      addOutcomeQuote(quoteMap, side, bookmaker, market, outcome);
      byMarketKey.set(marketKey, quoteMap);
      meta.set(marketKey, { player, line: outcome.point });
    }
  }

  const markets: Market[] = [];
  for (const [marketKey, quoteMap] of byMarketKey) {
    const info = meta.get(marketKey);
    if (!info) continue;
    const type = `${apiKey}__${marketKey}`;
    const market = marketFromQuoteMap(
      type,
      `${info.player} — ${statLabel} O/U ${info.line}`,
      quoteMap,
      [
        { id: "over", label: `Over ${info.line}` },
        { id: "under", label: `Under ${info.line}` },
      ]
    );
    if (market) markets.push(market);
  }

  return markets.sort((a, b) => a.label.localeCompare(b.label));
}

function capitalizeWords(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildAlternateTotalsMarkets(
  bookmakers: OddsApiBookmaker[],
  apiKey: string,
  typePrefix: string,
  labelBase: string
): Market[] {
  const lines = new Set<number>();
  for (const bookmaker of bookmakers) {
    const market = bookmaker.markets.find((m) => m.key === apiKey);
    if (!market) continue;
    for (const outcome of market.outcomes) {
      if (outcome.point !== undefined) lines.add(outcome.point);
    }
  }

  const markets: Market[] = [];
  for (const line of [...lines].sort((a, b) => a - b)) {
    const quoteMap = new Map<string, BookmakerQuote[]>();
    for (const bookmaker of bookmakers) {
      const market = bookmaker.markets.find(
        (m) => m.key === apiKey && m.outcomes.some((o) => o.point === line)
      );
      if (!market) continue;

      for (const outcome of market.outcomes) {
        if (outcome.point !== line) continue;
        const side = selectionSideFromOutcome(outcome);
        if (side !== "over" && side !== "under") continue;
        addOutcomeQuote(quoteMap, side, bookmaker, market, outcome);
      }
    }

    const built = marketFromQuoteMap(
      overUnderMarketType(typePrefix, line),
      `${labelBase} O/U ${line}`,
      quoteMap,
      [
        { id: "over", label: `Over ${line}` },
        { id: "under", label: `Under ${line}` },
      ]
    );
    if (built) markets.push(built);
  }

  return markets;
}

export function buildAlternateSpreadsMarkets(
  event: OddsApiEvent,
  bookmakers: OddsApiBookmaker[],
  apiKey: string,
  typePrefix: string,
  labelBase: string
): Market[] {
  const lineMaps = new Map<string, Map<string, BookmakerQuote[]>>();

  for (const bookmaker of bookmakers) {
    const market = bookmaker.markets.find((m) => m.key === apiKey);
    if (!market) continue;

    for (const outcome of market.outcomes) {
      if (outcome.point === undefined) continue;

      const isHome = outcome.name === event.home_team;
      const isAway = outcome.name === event.away_team;
      if (!isHome && !isAway) continue;

      const homePoint = isHome ? outcome.point : -outcome.point;
      const type = handicapMarketType(typePrefix, homePoint);
      const quoteMap = lineMaps.get(type) ?? new Map<string, BookmakerQuote[]>();
      const selectionId = isHome ? `home_${outcome.point}` : `away_${outcome.point}`;
      addOutcomeQuote(quoteMap, selectionId, bookmaker, market, outcome);
      lineMaps.set(type, quoteMap);
    }
  }

  const markets: Market[] = [];
  for (const [type, quoteMap] of lineMaps) {
    const homePoint = parseHandicapType(type, typePrefix);
    if (homePoint === null) continue;
    const awayPoint = -homePoint;
    const built = marketFromQuoteMap(
      type,
      `${labelBase} ${homePoint > 0 ? "+" : ""}${homePoint}`,
      quoteMap,
      [
        {
          id: `home_${homePoint}`,
          label: `${event.home_team} ${homePoint > 0 ? "+" : ""}${homePoint}`,
        },
        {
          id: `away_${awayPoint}`,
          label: `${event.away_team} ${awayPoint > 0 ? "+" : ""}${awayPoint}`,
        },
      ]
    );
    if (built) markets.push(built);
  }

  return markets.sort((a, b) => a.label.localeCompare(b.label));
}

function parseHandicapType(type: string, prefix: string): number | null {
  const raw = type.replace(`${prefix}_handicap_`, "");
  if (raw.startsWith("m")) return -Number(raw.slice(1)) / 10;
  return Number(raw) / 10;
}

export function buildAlternateTeamTotalsMarkets(
  bookmakers: OddsApiBookmaker[],
  apiKey: string,
  typePrefix: string,
  labelBase: string
): Market[] {
  const byKey = new Map<string, Map<string, BookmakerQuote[]>>();
  const meta = new Map<string, { team: string; line: number }>();

  for (const bookmaker of bookmakers) {
    const market = bookmaker.markets.find((m) => m.key === apiKey);
    if (!market) continue;

    for (const outcome of market.outcomes) {
      const side = selectionSideFromOutcome(outcome);
      if ((side !== "over" && side !== "under") || outcome.point === undefined) continue;

      const team = outcome.description?.trim() || outcome.name.trim();
      if (isOver(team) || isUnder(team)) continue;

      const teamKey = slugify(team);
      const key = `${teamKey}__${lineKey(outcome.point)}`;
      const quoteMap = byKey.get(key) ?? new Map<string, BookmakerQuote[]>();
      addOutcomeQuote(quoteMap, side, bookmaker, market, outcome);
      byKey.set(key, quoteMap);
      meta.set(key, { team, line: outcome.point });
    }
  }

  const markets: Market[] = [];
  for (const [key, quoteMap] of byKey) {
    const info = meta.get(key);
    if (!info) continue;
    const built = marketFromQuoteMap(
      `${typePrefix}__${key}`,
      `${info.team} — ${labelBase} O/U ${info.line}`,
      quoteMap,
      [
        { id: "over", label: `Over ${info.line}` },
        { id: "under", label: `Under ${info.line}` },
      ]
    );
    if (built) markets.push(built);
  }

  return markets.sort((a, b) => a.label.localeCompare(b.label));
}

export function correctScoreSelectionId(outcomeName: string): string {
  const match = outcomeName.match(/(\d+)\s*[-:]\s*(\d+)/);
  if (match) return `${match[1]}_${match[2]}`;
  return slugify(outcomeName);
}

export function buildCorrectScoreMarket(
  bookmakers: OddsApiBookmaker[],
  apiKey: string,
  internalType: string,
  label: string
): Market | null {
  const quoteMap = new Map<string, BookmakerQuote[]>();
  const labels = new Map<string, string>();

  for (const bookmaker of bookmakers) {
    const market = bookmaker.markets.find((m) => m.key === apiKey);
    if (!market) continue;

    for (const outcome of market.outcomes) {
      const selectionId = correctScoreSelectionId(outcome.name);
      labels.set(selectionId, outcome.name);
      addOutcomeQuote(quoteMap, selectionId, bookmaker, market, outcome);
    }
  }

  if (quoteMap.size === 0) return null;

  const selections: MarketSelection[] = [...quoteMap.entries()]
    .map(([id, odds]) => ({
      id,
      label: labels.get(id) ?? id.replace("_", "-"),
      odds,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return { type: internalType, label, selections };
}

function halftimeFulltimeSelectionId(outcomeName: string, event: OddsApiEvent): string | null {
  const parts = outcomeName.split("/").map((p) => p.trim());
  if (parts.length !== 2) return slugify(outcomeName);

  const mapSide = (value: string): string | null => {
    const lower = value.toLowerCase();
    if (lower === "draw") return "draw";
    if (lower === event.home_team.toLowerCase()) return "home";
    if (lower === event.away_team.toLowerCase()) return "away";
    if (lower === "home") return "home";
    if (lower === "away") return "away";
    return null;
  };

  const ht = mapSide(parts[0]!);
  const ft = mapSide(parts[1]!);
  if (!ht || !ft) return slugify(outcomeName);
  return `${ht}_${ft}`;
}

export function buildHalftimeFulltimeMarket(
  event: OddsApiEvent,
  bookmakers: OddsApiBookmaker[]
): Market | null {
  const quoteMap = new Map<string, BookmakerQuote[]>();
  const labels = new Map<string, string>();

  for (const bookmaker of bookmakers) {
    const market = bookmaker.markets.find((m) => m.key === "halftime_fulltime");
    if (!market) continue;

    for (const outcome of market.outcomes) {
      const selectionId = halftimeFulltimeSelectionId(outcome.name, event);
      if (!selectionId) continue;
      labels.set(selectionId, outcome.name);
      addOutcomeQuote(quoteMap, selectionId, bookmaker, market, outcome);
    }
  }

  if (quoteMap.size === 0) return null;

  const selections: MarketSelection[] = [...quoteMap.entries()]
    .map(([id, odds]) => ({ id, label: labels.get(id) ?? id, odds }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return { type: "halftime_fulltime", label: "Half Time / Full Time", selections };
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

export function buildH2hStyleMarket(
  event: OddsApiEvent,
  bookmakers: OddsApiBookmaker[],
  apiKey: string,
  internalType: string,
  label: string,
  includeDraw: boolean
): Market | null {
  const quoteMap = new Map<string, BookmakerQuote[]>();

  for (const bookmaker of bookmakers) {
    const market = bookmaker.markets.find((m) => m.key === apiKey);
    if (!market) continue;

    for (const outcome of market.outcomes) {
      const selectionId = h2hSelectionId(outcome.name, event.home_team, event.away_team);
      if (!selectionId) continue;
      if (!includeDraw && selectionId === "draw") continue;
      addOutcomeQuote(quoteMap, selectionId, bookmaker, market, outcome);
    }
  }

  const selectionDefs = includeDraw
    ? [
        { id: "home", label: event.home_team },
        { id: "draw", label: "Draw" },
        { id: "away", label: event.away_team },
      ]
    : [
        { id: "home", label: event.home_team },
        { id: "away", label: event.away_team },
      ];

  return marketFromQuoteMap(internalType, label, quoteMap, selectionDefs);
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

export function buildDoubleChanceMarket(
  event: OddsApiEvent,
  bookmakers: OddsApiBookmaker[],
  apiKey: string,
  internalType: string,
  label: string
): Market | null {
  const quoteMap = new Map<string, BookmakerQuote[]>();

  for (const bookmaker of bookmakers) {
    const market = bookmaker.markets.find((m) => m.key === apiKey);
    if (!market) continue;

    for (const outcome of market.outcomes) {
      const selectionId = doubleChanceSelectionId(
        outcome.name,
        event.home_team,
        event.away_team
      );
      if (!selectionId) continue;
      addOutcomeQuote(quoteMap, selectionId, bookmaker, market, outcome);
    }
  }

  return marketFromQuoteMap(internalType, label, quoteMap, [
    { id: "home_draw", label: `${event.home_team} or Draw` },
    { id: "draw_away", label: `Draw or ${event.away_team}` },
    { id: "home_away", label: `${event.home_team} or ${event.away_team}` },
  ]);
}

export function buildDrawNoBetMarket(
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
      addOutcomeQuote(quoteMap, selectionId, bookmaker, market, outcome);
    }
  }

  return marketFromQuoteMap("draw_no_bet", "Draw No Bet", quoteMap, [
    { id: "home", label: event.home_team },
    { id: "away", label: event.away_team },
  ]);
}
