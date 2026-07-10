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

export function findMatchForLeg(
  matches: FootballDataMatch[],
  homeTeam: string,
  awayTeam: string,
  kickoff: Date
): FootballDataMatch | undefined {
  const kickoffDay = formatDate(kickoff);

  return matches.find((match) => {
    if (!teamNamesMatch(match.homeTeam.name, homeTeam)) return false;
    if (!teamNamesMatch(match.awayTeam.name, awayTeam)) return false;

    const matchDay = formatDate(new Date(match.utcDate));
    return matchDay === kickoffDay;
  });
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

  return toMatchResult(match);
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
