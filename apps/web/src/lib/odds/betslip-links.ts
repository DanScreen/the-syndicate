import { withAffiliateParams } from "@/lib/odds/affiliate";
import type { AccaBookmakerRanking } from "@tiki-acca/shared";

export type BetslipLinkQuality = "deeplink" | "hub";

export type LegBetslipLink = {
  legId: string;
  userName: string;
  selectionLabel: string;
  fixtureLabel: string;
  url: string | null;
  linkQuality: BetslipLinkQuality | null;
};

export type RankedBetslipLink = AccaBookmakerRanking & {
  url: string | null;
  hasAllLegLinks: boolean;
  linkQuality: BetslipLinkQuality | null;
};

export type RoundBetslipLinks = {
  primaryLink: string | null;
  primaryBookmakerId: string | null;
  primaryLinkQuality: BetslipLinkQuality | null;
  primaryHasAllLegLinks: boolean;
  rankedLinks: RankedBetslipLink[];
  legLinks: LegBetslipLink[];
};

type LegForBetslip = {
  id: string;
  selectionLabel: string;
  homeTeam: string;
  awayTeam: string;
  betslipUrl?: string | null;
  bookmakerLinks?: unknown;
  user: { name: string };
};

const BOOKMAKER_HUB_URLS: Record<string, string> = {
  bet365: "https://www.bet365.com/#/AC/B1/C1/D1002/E/",
  williamhill: "https://sports.williamhill.com/betting/en-gb/football",
  paddypower: "https://www.paddypower.com/football",
  skybet: "https://skybet.com/football",
  ladbrokes_uk: "https://sports.ladbrokes.com/football",
  coral: "https://sports.coral.co.uk/football",
  betfair: "https://www.betfair.com/betting/football/s-1",
  unibet_uk: "https://www.unibet.co.uk/betting/sports/filter/football",
  betway: "https://betway.com/en-gb/sports/grp/football",
  boylesports: "https://www.boylesports.com/sports/football",
  betvictor: "https://www.betvictor.com/en-gb/sports/football",
  virginbet: "https://www.virginbet.com/sports/football",
  livescorebet: "https://www.livescorebet.com/uk/sports/football",
  grosvenor: "https://www.grosvenorcasinos.com/sport/football",
  casumo: "https://www.casumo.com/en-gb/sports/football",
  leovegas: "https://www.leovegas.com/en-gb/sports/football",
  betuk: "https://www.betuk.com/sports/football",
  betfred: "https://www.betfred.com/sports/football",
  tote: "https://www.totesport.com/sports/football",
  copybet: "https://www.copybet.com/sport/football",
};

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, "").toLowerCase();
}

const HUB_URL_SET = new Set(Object.values(BOOKMAKER_HUB_URLS).map(normalizeUrl));

export function bookmakerHubUrl(bookmakerId: string): string | null {
  // Hub fallbacks carry affiliate tags too.
  return withAffiliateParams(BOOKMAKER_HUB_URLS[bookmakerId] ?? null, bookmakerId);
}

/** True when URL is a known generic football hub (not a selection/event deeplink). */
export function isBookmakerHubUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const normalized = normalizeUrl(url);
  if (HUB_URL_SET.has(normalized)) return true;
  // Tolerate query/hash variants of a known hub base
  for (const hub of HUB_URL_SET) {
    if (normalized === hub || normalized.startsWith(`${hub}?`) || normalized.startsWith(`${hub}#`)) {
      return true;
    }
  }
  return false;
}

export function filterRealDeeplinks(
  links: Record<string, string> | null | undefined
): Record<string, string> {
  if (!links) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(links)) {
    if (typeof value === "string" && value && !isBookmakerHubUrl(value)) {
      out[key] = value;
    }
  }
  return out;
}

function parseBookmakerLinks(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const links: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string" && value) links[key] = value;
  }
  return filterRealDeeplinks(links);
}

function realUrl(url: string | null | undefined): string | null {
  if (!url || isBookmakerHubUrl(url)) return null;
  return url;
}

function deeplinkForLeg(leg: LegForBetslip, bookmakerId: string): string | null {
  const links = parseBookmakerLinks(leg.bookmakerLinks);
  return links[bookmakerId] ?? null;
}

function rankedLinkForBookmaker(
  legs: LegForBetslip[],
  bookmakerId: string
): {
  url: string | null;
  hasAllLegLinks: boolean;
  linkQuality: BetslipLinkQuality | null;
} {
  const legUrls = legs
    .map((leg) => deeplinkForLeg(leg, bookmakerId))
    .filter((url): url is string => Boolean(url));

  const hasAllLegLinks = legUrls.length === legs.length && legs.length > 0;

  if (legUrls[0]) {
    return { url: legUrls[0], hasAllLegLinks, linkQuality: "deeplink" };
  }

  const hub = bookmakerHubUrl(bookmakerId);
  if (hub) {
    return { url: hub, hasAllLegLinks: false, linkQuality: "hub" };
  }

  return { url: null, hasAllLegLinks: false, linkQuality: null };
}

export function buildRoundBetslipLinks(
  legs: LegForBetslip[],
  rankings: AccaBookmakerRanking[],
  bestBookmakerId: string | null
): RoundBetslipLinks {
  const rankedLinks: RankedBetslipLink[] = rankings.map((ranking) => {
    const { url, hasAllLegLinks, linkQuality } = rankedLinkForBookmaker(
      legs,
      ranking.bookmakerId
    );
    return {
      ...ranking,
      url: withAffiliateParams(url, ranking.bookmakerId),
      hasAllLegLinks,
      linkQuality,
    };
  });

  const primaryBookmakerId = bestBookmakerId ?? rankedLinks[0]?.bookmakerId ?? null;
  const primaryResolved = primaryBookmakerId
    ? rankedLinkForBookmaker(legs, primaryBookmakerId)
    : { url: null, hasAllLegLinks: false, linkQuality: null as BetslipLinkQuality | null };
  const primaryRank = rankedLinks.find((r) => r.bookmakerId === primaryBookmakerId);
  const primaryLink = withAffiliateParams(
    primaryResolved.url ?? primaryRank?.url ?? null,
    primaryBookmakerId
  );
  const primaryLinkQuality =
    primaryResolved.linkQuality ?? primaryRank?.linkQuality ?? null;
  const primaryHasAllLegLinks =
    primaryResolved.hasAllLegLinks || primaryRank?.hasAllLegLinks === true;

  const legLinks: LegBetslipLink[] = legs.map((leg) => {
    const preferred =
      (primaryBookmakerId ? deeplinkForLeg(leg, primaryBookmakerId) : null) ??
      realUrl(leg.betslipUrl);
    return {
      legId: leg.id,
      userName: leg.user.name,
      selectionLabel: leg.selectionLabel,
      fixtureLabel: `${leg.homeTeam} vs ${leg.awayTeam}`,
      url: withAffiliateParams(preferred, primaryBookmakerId),
      linkQuality: preferred ? "deeplink" : null,
    };
  });

  return {
    primaryLink,
    primaryBookmakerId,
    primaryLinkQuality,
    primaryHasAllLegLinks,
    rankedLinks,
    legLinks,
  };
}

/** @deprecated Use buildRoundBetslipLinks — kept for backwards compatibility */
export function generateBetslipLink(
  bookmakerId: string,
  _legs: unknown[],
  _combinedOdds: number
): string {
  return bookmakerHubUrl(bookmakerId) ?? "https://www.bet365.com";
}

export function calculateCombinedOdds(odds: number[]): number {
  return Number(odds.reduce((acc, o) => acc * o, 1).toFixed(2));
}
