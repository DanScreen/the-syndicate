export type BetslipLinkQuality = "deeplink" | "hub";

/** Number of ranked bookmakers shown before the user expands the comparison. */
export const BOOKMAKER_RANKINGS_PREVIEW_COUNT = 3;

export type AccaBookmakerRanking = {
  bookmakerId: string;
  bookmakerName: string;
  combinedOdds: number;
  url?: string | null;
  hasAllLegLinks?: boolean;
  /** Whether `url` is a real Odds API deeplink or a generic hub fallback. */
  linkQuality?: BetslipLinkQuality | null;
};
