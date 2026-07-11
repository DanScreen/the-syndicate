/** True when The Odds API key is present for live fixture/odds fetches. */
export function isOddsApiConfigured(): boolean {
  const key = process.env.ODDS_API_KEY?.trim();
  return Boolean(key);
}

/** The Odds API requires YYYY-MM-DDTHH:MM:SSZ (no milliseconds). */
export function formatCommenceTimeFrom(date: Date = new Date()): string {
  return date.toISOString().slice(0, 19) + "Z";
}

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}
