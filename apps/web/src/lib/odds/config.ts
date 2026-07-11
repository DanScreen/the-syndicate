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

/** When true, user-facing routes read odds from DB only; The Odds API is called by cron/admin. */
export function oddsDbOnly(): boolean {
  return process.env.ODDS_DB_ONLY === "true";
}

/** Prefetch core extended markets for fixtures kicking off within this many hours (cron). */
export function oddsWarmCoreWithinHours(): number {
  const configured = Number(process.env.ODDS_WARM_CORE_WITHIN_HOURS);
  return Number.isFinite(configured) && configured > 0 ? configured : 72;
}

export function oddsApiRegions(): string {
  return process.env.ODDS_API_REGIONS ?? "uk";
}
