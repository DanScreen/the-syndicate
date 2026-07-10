import type { GROUP_STATUSES, LEG_OUTCOMES, ROUND_STATUSES } from "./constants";

export type GroupStatus = (typeof GROUP_STATUSES)[number];
export type RoundStatus = (typeof ROUND_STATUSES)[number];
export type LegOutcome = (typeof LEG_OUTCOMES)[number];

export type BookmakerQuote = {
  bookmakerId: string;
  bookmakerName: string;
  odds: number;
  link?: string;
};

export type MarketSelection = {
  id: string;
  label: string;
  odds: BookmakerQuote[];
};

export type Market = {
  type: string;
  label: string;
  selections: MarketSelection[];
};

export type Fixture = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  kickoff: string;
  markets: Market[];
};

export type GroupSettings = {
  sport: "football";
  maxMembers: number;
};

export type LeaderboardEntry = {
  userId: string;
  name: string;
  points: number;
  legsWon: number;
  legsLost: number;
};
