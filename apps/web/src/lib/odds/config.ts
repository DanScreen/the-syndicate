/** True when The Odds API key is present for live fixture/odds fetches. */
export function isOddsApiConfigured(): boolean {
  const key = process.env.ODDS_API_KEY?.trim();
  return Boolean(key);
}

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}
