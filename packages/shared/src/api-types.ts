import type { AccaBookmakerRanking } from "./acca";
import type { Fixture, LeaderboardEntry, Market, RoundStatus } from "./types";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type MobileSignInResponse = {
  token: string;
  user: AuthUser;
};

export type GroupSummary = {
  id: string;
  name: string;
  inviteCode: string;
  role: string;
  memberCount: number;
  status: string;
  ownerName: string;
  points: number;
  activeRound: {
    id: string;
    status: RoundStatus;
    combinedOdds: number | null;
  } | null;
};

export type GroupsListResponse = {
  groups: GroupSummary[];
};

export type GroupMember = {
  id: string;
  name: string;
  role: string;
};

export type GroupLeg = {
  id: string;
  user: { id: string; name: string };
  homeTeam: string;
  awayTeam: string;
  competition?: string;
  selectionLabel: string;
  marketLabel: string;
  odds: number;
  bookmakerName: string;
  outcome: string;
  pointsAwarded: number;
};

export type GroupLeaderboardEntry = LeaderboardEntry & {
  role?: string;
};

export type BetslipLinks = {
  primaryLink: string | null;
  primaryBookmakerId: string | null;
  legLinks: {
    legId: string;
    userName?: string;
    selectionLabel?: string;
    fixtureLabel?: string;
    url: string | null;
  }[];
};

export type RecentRoundSummary = {
  id: string;
  status: string;
  combinedOdds: number | null;
  legs: {
    selectionLabel: string;
    outcome: string;
    odds?: number;
    pointsAwarded?: number;
  }[];
};

export type GroupDetailResponse = {
  group: {
    id: string;
    name: string;
    inviteCode: string;
    status: string;
    owner: { id: string; name: string };
    memberCount: number;
    members: GroupMember[];
  };
  leaderboard: GroupLeaderboardEntry[];
  activeRound: {
    id: string;
    status: RoundStatus;
    combinedOdds: number | null;
    bestBookmakerId: string | null;
    legs: GroupLeg[];
    accaBookmakerRankings?: AccaBookmakerRanking[] | null;
  } | null;
  betslipLink: string | null;
  betslipLinks: BetslipLinks | null;
  isOwner: boolean;
  recentRounds?: RecentRoundSummary[];
};

export type CompetitionOption = {
  id: string;
  name: string;
};

export type CompetitionsResponse = {
  competitions: CompetitionOption[];
};

export type FixturesResponse = {
  fixtures: Fixture[];
  source?: string;
  oddsConfigured?: boolean;
  competitionId: string;
};

export type MarketTierOption = {
  id: string;
  label: string;
  description: string;
  credits?: number;
};

export type FixtureMarketsResponse = {
  markets: Market[];
  tier: string;
  tiers: MarketTierOption[];
};

export type GroupStatsSummary = {
  totalRounds: number;
  totalBets: number;
  averageLegOdds: number | null;
  averageAccaOdds: number | null;
  netGroupPoints: number;
  netAccaPlGbp: number;
  winRate: number | null;
};

export type GroupStatsChartPoint = {
  roundNumber: number;
  roundId: string;
  label: string;
  roundPoints: number;
  cumulativePoints: number;
};

export type MemberSeries = {
  userId: string;
  name: string;
};

export type MemberChartPoint = {
  roundNumber: number;
  label: string;
  [key: string]: number | string;
};

export type GroupStatsResponse = {
  summary: GroupStatsSummary;
  chart: GroupStatsChartPoint[];
  members: MemberSeries[];
  memberChart: MemberChartPoint[];
};

export type UserStatsSummary = {
  groupCount: number;
  settledRounds: number;
  legsPlayed: number;
  netPoints: number;
  winRate: number | null;
  netAccaPlGbp: number;
};

export type UserStatsGroupBreakdown = {
  groupId: string;
  groupName: string;
  netPoints: number;
  legsPlayed: number;
  settledRounds: number;
};

export type UserStatsChartPoint = {
  roundNumber: number;
  label: string;
  roundPoints: number;
  cumulativePoints: number;
  groupName: string;
};

export type UserStatsResponse = {
  summary: UserStatsSummary;
  chart: UserStatsChartPoint[];
  groups: UserStatsGroupBreakdown[];
};

export type LegHighlight = {
  odds: number;
  homeTeam: string;
  awayTeam: string;
  marketLabel: string;
  selectionLabel: string;
  competition: string;
};

export type MemberStatsSummary = {
  netPoints: number;
  legsPlayed: number;
  winRate: number | null;
  averageOdds: number | null;
  bestLeg: LegHighlight | null;
  worstLeg: LegHighlight | null;
};

export type MemberCategoryStats = {
  favourite: string | null;
  bestWorst: { best: string; worst: string } | null;
};

export type MemberStatsResponse = {
  userId: string;
  name: string;
  summary: MemberStatsSummary;
  chart: { roundNumber: number; label: string; roundPoints: number; cumulativePoints: number }[];
  competition: MemberCategoryStats;
  market: MemberCategoryStats;
  team: MemberCategoryStats;
};
