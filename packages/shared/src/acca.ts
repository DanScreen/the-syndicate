export type BetslipLinkQuality = "deeplink" | "hub";

export type AccaBookmakerRanking = {
  bookmakerId: string;
  bookmakerName: string;
  combinedOdds: number;
  url?: string | null;
  hasAllLegLinks?: boolean;
  /** Whether `url` is a real Odds API deeplink or a generic hub fallback. */
  linkQuality?: BetslipLinkQuality | null;
};
