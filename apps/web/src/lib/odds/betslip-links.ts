import type { AccaBookmakerRanking } from "@the-syndicate/shared";

export type LegBetslipLink = {
  legId: string;
  userName: string;
  selectionLabel: string;
  fixtureLabel: string;
  url: string | null;
};

export type RankedBetslipLink = AccaBookmakerRanking & {
  url: string | null;
  hasAllLegLinks: boolean;
};

export type RoundBetslipLinks = {
  primaryLink: string | null;
  primaryBookmakerId: string | null;
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

export function bookmakerHubUrl(bookmakerId: string): string | null {
  return BOOKMAKER_HUB_URLS[bookmakerId] ?? null;
}

function parseBookmakerLinks(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== "object") return null;
  const links: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string" && value) links[key] = value;
  }
  return Object.keys(links).length > 0 ? links : null;
}

function deeplinkForLeg(
  leg: LegForBetslip,
  bookmakerId: string
): string | null {
  const links = parseBookmakerLinks(leg.bookmakerLinks);
  if (links?.[bookmakerId]) return links[bookmakerId];
  return null;
}

function rankedLinkForBookmaker(
  legs: LegForBetslip[],
  bookmakerId: string
): { url: string | null; hasAllLegLinks: boolean } {
  const legUrls = legs
    .map((leg) => deeplinkForLeg(leg, bookmakerId))
    .filter((url): url is string => Boolean(url));

  const hasAllLegLinks = legUrls.length === legs.length && legs.length > 0;
  const url = legUrls[0] ?? bookmakerHubUrl(bookmakerId);

  return { url, hasAllLegLinks };
}

export function buildRoundBetslipLinks(
  legs: LegForBetslip[],
  rankings: AccaBookmakerRanking[],
  bestBookmakerId: string | null
): RoundBetslipLinks {
  const rankedLinks: RankedBetslipLink[] = rankings.map((ranking) => {
    const { url, hasAllLegLinks } = rankedLinkForBookmaker(legs, ranking.bookmakerId);
    return { ...ranking, url, hasAllLegLinks };
  });

  const primaryBookmakerId = bestBookmakerId ?? rankedLinks[0]?.bookmakerId ?? null;
  const primaryRank = rankedLinks.find((r) => r.bookmakerId === primaryBookmakerId);
  const primaryLink =
    (primaryBookmakerId && rankedLinkForBookmaker(legs, primaryBookmakerId).url) ??
    primaryRank?.url ??
    null;

  const legLinks: LegBetslipLink[] = legs.map((leg) => ({
    legId: leg.id,
    userName: leg.user.name,
    selectionLabel: leg.selectionLabel,
    fixtureLabel: `${leg.homeTeam} vs ${leg.awayTeam}`,
    url: leg.betslipUrl ?? null,
  }));

  return {
    primaryLink,
    primaryBookmakerId,
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
