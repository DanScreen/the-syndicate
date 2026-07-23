/**
 * Bookmaker branding helpers for compare-bookmakers UI.
 * Logos use Google favicons for the bookmaker's site (no local trademark assets).
 */

const BOOKMAKER_DOMAINS: Record<string, string> = {
  bet365: "bet365.com",
  williamhill: "williamhill.com",
  paddypower: "paddypower.com",
  skybet: "skybet.com",
  // Odds API key is sport888 (not 888sport) — guess would hit sport888.com
  sport888: "888sport.com",
  ladbrokes_uk: "ladbrokes.com",
  coral: "coral.co.uk",
  unibet_uk: "unibet.co.uk",
  betway: "betway.com",
  boylesports: "boylesports.com",
  betvictor: "betvictor.com",
  virginbet: "virginbet.com",
  livescorebet: "livescorebet.com",
  grosvenor: "grosvenorcasinos.com",
  casumo: "casumo.com",
  leovegas: "leovegas.com",
  betuk: "betuk.com",
  betfred: "betfred.com",
  tote: "totesport.com",
  copybet: "copybet.com",
  betfair: "betfair.com",
  sportingindex: "sportingindex.com",
  midnite: "midnite.com",
  betmgm: "betmgm.co.uk",
  netbet: "netbet.co.uk",
  tenbet: "10bet.co.uk",
  sportingbet: "sportingbet.com",
};

export function bookmakerDomain(bookmakerId: string): string | null {
  if (BOOKMAKER_DOMAINS[bookmakerId]) return BOOKMAKER_DOMAINS[bookmakerId];
  // Odds API keys are often snake_case brand names — last-ditch guess.
  const guess = bookmakerId.replace(/_/g, "").replace(/uk$/i, "");
  if (guess.length >= 3) return `${guess}.com`;
  return null;
}

/** Favicon-based logo URL for list cells; null if domain unknown. */
export function bookmakerLogoUrl(bookmakerId: string, size = 64): string | null {
  const domain = bookmakerDomain(bookmakerId);
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}

/** Initials for logo fallback (e.g. "William Hill" → "WH"). */
export function bookmakerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export type BookmakerRankPlace = 1 | 2 | 3 | "other";

export function bookmakerRankPlace(index: number): BookmakerRankPlace {
  if (index === 0) return 1;
  if (index === 1) return 2;
  if (index === 2) return 3;
  return "other";
}
