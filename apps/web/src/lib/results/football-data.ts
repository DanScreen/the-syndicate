import { getCached, setCached } from "@/lib/odds/cache";
import type { MatchResult } from "./resolve-leg";

const API_BASE = "https://api.football-data.org/v4";

type FootballDataTeam = {
  name: string;
  shortName?: string;
  tla?: string;
};

export type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  homeTeam: FootballDataTeam;
  awayTeam: FootballDataTeam;
  score: {
    fullTime: { home: number | null; away: number | null };
  };
};

type FootballDataMatchesResponse = {
  matches: FootballDataMatch[];
};

const TEAM_ALIASES: Record<string, string[]> = {
  southkorea: ["korearepublic", "southkorea", "korea"],
  usa: ["unitedstates", "usa", "us"],
  england: ["england"],
};

export function normalizeTeamName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function teamNamesMatch(a: string, b: string): boolean {
  const na = normalizeTeamName(a);
  const nb = normalizeTeamName(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;

  for (const aliases of Object.values(TEAM_ALIASES)) {
    if (aliases.includes(na) && aliases.includes(nb)) return true;
  }

  return false;
}

/** Leg home/away matches stored match home/away (Odds API vs football-data.org). */
export function isLegOrientationDirect(
  matchHome: string,
  matchAway: string,
  legHome: string,
  legAway: string
): boolean {
  return teamNamesMatch(matchHome, legHome) && teamNamesMatch(matchAway, legAway);
}

export function isLegOrientationReversed(
  matchHome: string,
  matchAway: string,
  legHome: string,
  legAway: string
): boolean {
  return teamNamesMatch(matchHome, legAway) && teamNamesMatch(matchAway, legHome);
}

/** Map match score to the leg's home/away perspective; null if teams don't match. */
export function alignGoalsToLeg(
  homeGoals: number,
  awayGoals: number,
  status: string,
  matchHome: string,
  matchAway: string,
  legHome: string,
  legAway: string
): MatchResult | null {
  if (isLegOrientationDirect(matchHome, matchAway, legHome, legAway)) {
    return { homeGoals, awayGoals, status };
  }

  if (isLegOrientationReversed(matchHome, matchAway, legHome, legAway)) {
    return { homeGoals: awayGoals, awayGoals: homeGoals, status };
  }

  return null;
}

const VOID_STATUSES = new Set(["POSTPONED", "CANCELLED", "SUSPENDED", "AWARDED"]);

export function toMatchResult(match: FootballDataMatch): MatchResult | null {
  const homeGoals = match.score.fullTime.home;
  const awayGoals = match.score.fullTime.away;

  if (homeGoals === null || awayGoals === null) {
    if (VOID_STATUSES.has(match.status)) {
      return { homeGoals: 0, awayGoals: 0, status: match.status };
    }
    return { homeGoals: 0, awayGoals: 0, status: match.status };
  }

  return {
    homeGoals,
    awayGoals,
    status: match.status,
  };
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function syncDateRange(): { from: Date; to: Date } {
  const from = new Date();
  from.setDate(from.getDate() - 3);
  from.setHours(0, 0, 0, 0);

  const to = new Date();
  to.setDate(to.getDate() + 14);
  to.setHours(23, 59, 59, 999);

  return { from, to };
}

async function fetchFromFootballData(url: URL): Promise<FootballDataMatch[]> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    throw new Error("FOOTBALL_DATA_API_KEY is not configured");
  }

  const res = await fetch(url.toString(), {
    headers: { "X-Auth-Token": apiKey },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`football-data.org error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as FootballDataMatchesResponse;
  return data.matches ?? [];
}

export async function fetchCompetitionMatches(
  footballDataCode: string,
  from: Date,
  to: Date,
  options?: { bypassCache?: boolean }
): Promise<FootballDataMatch[]> {
  const cacheTtlMs = Number(process.env.FOOTBALL_DATA_CACHE_TTL_MS ?? 60_000);
  const cacheKey = `football-data:comp:${footballDataCode}:${formatDate(from)}:${formatDate(to)}`;
  if (!options?.bypassCache) {
    const cached = getCached<FootballDataMatch[]>(cacheKey);
    if (cached) return cached;
  }

  const url = new URL(`${API_BASE}/competitions/${footballDataCode}/matches`);
  url.searchParams.set("dateFrom", formatDate(from));
  url.searchParams.set("dateTo", formatDate(to));

  const matches = await fetchFromFootballData(url);
  return setCached(cacheKey, matches, cacheTtlMs);
}

export async function fetchMatchesInRange(
  from: Date,
  to: Date,
  options?: { bypassCache?: boolean }
): Promise<FootballDataMatch[]> {
  const cacheTtlMs = Number(process.env.FOOTBALL_DATA_CACHE_TTL_MS ?? 60_000);
  const cacheKey = `football-data:${formatDate(from)}:${formatDate(to)}`;
  if (!options?.bypassCache) {
    const cached = getCached<FootballDataMatch[]>(cacheKey);
    if (cached) return cached;
  }

  const url = new URL(`${API_BASE}/matches`);
  url.searchParams.set("dateFrom", formatDate(from));
  url.searchParams.set("dateTo", formatDate(to));

  const matches = await fetchFromFootballData(url);
  return setCached(cacheKey, matches, cacheTtlMs);
}

function matchOnKickoffDay(match: FootballDataMatch, kickoff: Date): boolean {
  return formatDate(new Date(match.utcDate)) === formatDate(kickoff);
}

export function findMatchForLeg(
  matches: FootballDataMatch[],
  homeTeam: string,
  awayTeam: string,
  kickoff: Date
): FootballDataMatch | undefined {
  const direct = matches.find(
    (match) =>
      matchOnKickoffDay(match, kickoff) &&
      isLegOrientationDirect(match.homeTeam.name, match.awayTeam.name, homeTeam, awayTeam)
  );
  if (direct) return direct;

  return matches.find(
    (match) =>
      matchOnKickoffDay(match, kickoff) &&
      isLegOrientationReversed(match.homeTeam.name, match.awayTeam.name, homeTeam, awayTeam)
  );
}

export async function getMatchResultForLeg(
  leg: {
    homeTeam: string;
    awayTeam: string;
    kickoff: Date;
  },
  matches?: FootballDataMatch[]
): Promise<MatchResult | null> {
  const from = new Date(leg.kickoff);
  from.setDate(from.getDate() - 1);
  const to = new Date(leg.kickoff);
  to.setDate(to.getDate() + 1);

  const pool = matches ?? (await fetchMatchesInRange(from, to));
  const match = findMatchForLeg(pool, leg.homeTeam, leg.awayTeam, leg.kickoff);
  if (!match) return null;

  const raw = toMatchResult(match);
  if (!raw) return null;

  return (
    alignGoalsToLeg(
      raw.homeGoals,
      raw.awayGoals,
      raw.status,
      match.homeTeam.name,
      match.awayTeam.name,
      leg.homeTeam,
      leg.awayTeam
    ) ?? raw
  );
}

export async function fetchMatchesForLegs(
  legs: { kickoff: Date }[]
): Promise<FootballDataMatch[]> {
  if (legs.length === 0) return [];

  const kickoffs = legs.map((l) => l.kickoff.getTime());
  const from = new Date(Math.min(...kickoffs));
  from.setDate(from.getDate() - 1);
  const to = new Date(Math.max(...kickoffs));
  to.setDate(to.getDate() + 1);

  return fetchMatchesInRange(from, to);
}
