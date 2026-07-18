/**
 * Affiliate tracking for outbound bookmaker links (Phase A of
 * docs/specs/affiliate-and-betslips.md).
 *
 * Configure per bookmaker via env — no code change needed when a programme
 * approves us:
 *
 *   AFFILIATE_<ID>_PARAMS
 *
 * where <ID> is the Odds API bookmaker id uppercased with non-alphanumerics
 * as underscores (`bet365` → AFFILIATE_BET365_PARAMS, `sky_bet` →
 * AFFILIATE_SKY_BET_PARAMS). The value is the raw query fragment issued by
 * the programme, e.g. `affiliate=365_012345` or `btag=a_1234b_5678`.
 */

export function affiliateEnvKey(bookmakerId: string): string {
  return `AFFILIATE_${bookmakerId.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_PARAMS`;
}

function affiliateParamsFor(bookmakerId: string): string | null {
  if (!bookmakerId) return null;
  const value = process.env[affiliateEnvKey(bookmakerId)]?.trim();
  if (!value) return null;
  return value.replace(/^[?&]+/, "");
}

/** Append the bookmaker's tracking params to a link, preserving any #fragment. */
export function withAffiliateParams(
  url: string | null,
  bookmakerId: string | null | undefined
): string | null {
  if (!url || !bookmakerId) return url;
  const params = affiliateParamsFor(bookmakerId);
  if (!params || url.includes(params)) return url;
  const hashIndex = url.indexOf("#");
  const base = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? "" : url.slice(hashIndex);
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}${params}${fragment}`;
}
