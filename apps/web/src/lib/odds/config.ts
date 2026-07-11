/** True when The Odds API key is present for live fixture/odds fetches. */
export function isOddsApiConfigured(): boolean {
  const key = process.env.ODDS_API_KEY?.trim();
  return Boolean(key);
}

/** Default in-memory cache TTL for Odds API responses (30 minutes). */
export const DEFAULT_ODDS_CACHE_TTL_MS = 1_800_000;

/** After quota exhaustion, avoid repeat API calls for this long. */
export const ODDS_QUOTA_BLOCK_TTL_MS = 900_000;

export function oddsCacheTtlMs(): number {
  const configured = Number(process.env.ODDS_API_CACHE_TTL_MS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_ODDS_CACHE_TTL_MS;
}

export const ODDS_QUOTA_BLOCK_CACHE_KEY = "odds-api:quota-blocked";

export const ODDS_QUOTA_SNAPSHOT_CACHE_KEY = "odds-api:quota-snapshot";

/** The Odds API requires YYYY-MM-DDTHH:MM:SSZ (no milliseconds). */
export function formatCommenceTimeFrom(date: Date = new Date()): string {
  return date.toISOString().slice(0, 19) + "Z";
}

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}
