import type { ObservedStats, ScorePair } from "@/lib/results/consensus";
import type { ProviderReading } from "@/lib/results/observations";

/**
 * API-Football v3 (api-sports.io) results client. Read-only; used for
 * results + stats consensus (docs/specs/odds-and-results-sourcing.md).
 * Quota: Pro plan 7,500 requests/day — see API_FOOTBALL_* notes in DEPLOYMENT.md.
 */

const API_BASE = "https://v3.football.api-sports.io";

/** `fixtures?ids=` accepts at most 20 ids per request. */
export const API_FOOTBALL_IDS_PER_REQUEST = 20;

type Pair = { home: number | null; away: number | null };

export type ApiFootballFixture = {
  fixture: {
    id: number;
    date: string;
    status: { short: string; elapsed?: number | null };
  };
  league: { id: number; season?: number };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  goals: Pair;
  score: {
    halftime?: Pair;
    fulltime?: Pair;
    extratime?: Pair;
    penalty?: Pair;
  };
  /** Present on `fixtures?ids=` responses. */
  statistics?: {
    team: { id: number };
    statistics: { type: string; value: number | string | null }[];
  }[];
};

type ApiFootballResponse = {
  errors?: unknown;
  response?: ApiFootballFixture[];
};

/**
 * API-Football short status → football-data.org vocabulary (what Match.status
 * and the settlement code already use).
 */
const STATUS_MAP: Record<string, string> = {
  TBD: "SCHEDULED",
  NS: "SCHEDULED",
  "1H": "IN_PLAY",
  "2H": "IN_PLAY",
  ET: "IN_PLAY",
  BT: "IN_PLAY",
  P: "IN_PLAY",
  LIVE: "IN_PLAY",
  INT: "IN_PLAY",
  SUSP: "IN_PLAY",
  HT: "PAUSED",
  FT: "FINISHED",
  AET: "FINISHED",
  PEN: "FINISHED",
  PST: "POSTPONED",
  CANC: "CANCELLED",
  ABD: "SUSPENDED",
  AWD: "AWARDED",
  WO: "AWARDED",
};

export function apiFootballStatus(short: string): string {
  return STATUS_MAP[short] ?? "SCHEDULED";
}

function numberOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function statValue(
  entry: NonNullable<ApiFootballFixture["statistics"]>[number] | undefined,
  type: string
): number | null {
  const stat = entry?.statistics.find((s) => s.type === type);
  if (!stat || stat.value === null) return null;
  const value = typeof stat.value === "number" ? stat.value : Number(stat.value);
  return Number.isFinite(value) ? value : null;
}

/** A null value for either side means "not reported", never zero. */
function statPair(
  fixture: ApiFootballFixture,
  type: string
): ScorePair | null {
  const homeEntry = fixture.statistics?.find((s) => s.team.id === fixture.teams.home.id);
  const awayEntry = fixture.statistics?.find((s) => s.team.id === fixture.teams.away.id);
  const home = statValue(homeEntry, type);
  const away = statValue(awayEntry, type);
  return home === null || away === null ? null : { home, away };
}

export function apiFootballStats(fixture: ApiFootballFixture): ObservedStats | null {
  if (!fixture.statistics?.length) return null;
  const stats: ObservedStats = {
    corners: statPair(fixture, "Corner Kicks"),
    yellowCards: statPair(fixture, "Yellow Cards"),
    redCards: statPair(fixture, "Red Cards"),
  };
  return stats.corners || stats.yellowCards || stats.redCards ? stats : null;
}

/**
 * Fixture → observation in API-Football's own orientation.
 * `score.fulltime` is the 90' score (extra-time goals are in `score.extratime`);
 * `goals` is the running / final total.
 */
export function apiFootballReading(fixture: ApiFootballFixture): ProviderReading {
  const short = fixture.fixture.status.short;
  const status = apiFootballStatus(short);
  const extraTime = short === "AET" || short === "PEN";
  const fulltime = fixture.score.fulltime;
  const halftime = fixture.score.halftime;
  const finished = status === "FINISHED";

  return {
    status,
    // Only trust `fulltime` once the match is over; live, fall back to goals.
    homeGoals90: finished ? numberOrNull(fulltime?.home) : numberOrNull(fixture.goals.home),
    awayGoals90: finished ? numberOrNull(fulltime?.away) : numberOrNull(fixture.goals.away),
    homeGoalsEnd: numberOrNull(fixture.goals.home),
    awayGoalsEnd: numberOrNull(fixture.goals.away),
    homeGoalsHt: numberOrNull(halftime?.home),
    awayGoalsHt: numberOrNull(halftime?.away),
    extraTime,
    stats: apiFootballStats(fixture),
  };
}

export type ApiFootballQuota = { remaining: number | null };

/** Last seen `x-ratelimit-requests-remaining` (daily), for logs / admin. */
export const apiFootballQuota: ApiFootballQuota = { remaining: null };

export function isApiFootballConfigured(): boolean {
  return Boolean(process.env.API_FOOTBALL_KEY);
}

function hasErrors(errors: unknown): boolean {
  if (!errors) return false;
  if (Array.isArray(errors)) return errors.length > 0;
  if (typeof errors === "object") return Object.keys(errors as object).length > 0;
  return true;
}

async function apiFootballGet(
  path: string,
  params: Record<string, string>
): Promise<ApiFootballFixture[]> {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) throw new Error("API_FOOTBALL_KEY is not configured");

  const url = new URL(`${API_BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    headers: { "x-apisports-key": apiKey },
    cache: "no-store",
  });

  const remaining = res.headers.get("x-ratelimit-requests-remaining");
  if (remaining !== null && Number.isFinite(Number(remaining))) {
    apiFootballQuota.remaining = Number(remaining);
  }

  if (!res.ok) {
    throw new Error(`API-Football error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }

  const body = (await res.json()) as ApiFootballResponse;
  // API-Football reports auth / quota / parameter problems with HTTP 200.
  if (hasErrors(body.errors)) {
    throw new Error(`API-Football error: ${JSON.stringify(body.errors).slice(0, 200)}`);
  }
  return body.response ?? [];
}

/** Every fixture on a UTC date (all leagues, ~1MB) — filter by league client-side. */
export function fetchApiFootballFixturesByDate(date: string): Promise<ApiFootballFixture[]> {
  return apiFootballGet("fixtures", { date });
}

/** Full fixtures (incl. statistics) by id, ≤20 per request. */
export async function fetchApiFootballFixturesByIds(
  ids: number[]
): Promise<ApiFootballFixture[]> {
  const out: ApiFootballFixture[] = [];
  for (let i = 0; i < ids.length; i += API_FOOTBALL_IDS_PER_REQUEST) {
    const chunk = ids.slice(i, i + API_FOOTBALL_IDS_PER_REQUEST);
    out.push(...(await apiFootballGet("fixtures", { ids: chunk.join("-") })));
  }
  return out;
}
