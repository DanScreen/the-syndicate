import type { AccaBookmakerRanking } from "./acca";
import type { Fixture, LeaderboardEntry, Market, RoundStatus } from "./types";

export type AuthUser = {
  id: string;
  firstName: string;
  lastName: string;
  /** Full display name (`firstName lastName`). */
  name: string;
  email: string;
};

export type MobileSignInResponse = {
  token: string;
  user: AuthUser;
};

export type GroupSummaryYourLeg = {
  selectionLabel: string;
  marketLabel: string;
  homeTeam: string;
  awayTeam: string;
  odds: number;
  outcome: string;
};

/** One submitted leg on the group's active round (open or locked betslip). */
export type GroupSummaryActiveLeg = {
  userId: string;
  userName: string;
  selectionLabel: string;
  marketLabel: string;
  homeTeam: string;
  awayTeam: string;
  odds: number;
  outcome: string;
};

export type GroupSummary = {
  id: string;
  name: string;
  inviteCode: string;
  role: string;
  memberCount: number;
  status: string;
  ownerName: string;
  /** Group default — legs each member submits on new rounds. */
  legsPerMember: number;
  /** Group acca points (combined-odds scoring on wins). */
  groupPoints: number;
  /** This member's leg points in the group. */
  points: number;
  activeRound: {
    id: string;
    status: RoundStatus;
    combinedOdds: number | null;
    legsPerMember: number;
  } | null;
  /** All submitted legs on the active round (current betslip). */
  activeLegs: GroupSummaryActiveLeg[];
  /** Member's first / primary leg in the active round, if any submitted. */
  yourLeg: GroupSummaryYourLeg | null;
  /** How many legs this member has submitted in the active round. */
  yourLegCount: number;
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
  legIndex?: number;
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  competition?: string;
  kickoff: string;
  marketType: string;
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
  primaryLinkQuality?: "deeplink" | "hub" | null;
  primaryHasAllLegLinks?: boolean;
  legLinks: {
    legId: string;
    userName?: string;
    selectionLabel?: string;
    fixtureLabel?: string;
    url: string | null;
    linkQuality?: "deeplink" | "hub" | null;
  }[];
};

export type HistoryLeg = {
  id: string;
  user: { id: string; name: string };
  homeTeam: string;
  awayTeam: string;
  competition: string;
  kickoff: string;
  selectionLabel: string;
  marketLabel: string;
  marketType: string;
  odds: number;
  bookmakerName: string;
  outcome: string;
  pointsAwarded: number;
};

export type HistoryRound = {
  id: string;
  status: string;
  combinedOdds: number | null;
  lockedAt: string | null;
  settledAt: string | null;
  createdAt: string;
  legs: HistoryLeg[];
};

export type GroupHistoryResponse = {
  rounds: HistoryRound[];
};

/** @deprecated Prefer HistoryRound — kept for older mobile clients during rollout. */
export type RecentRoundSummary = HistoryRound;

export type GroupDetailResponse = {
  group: {
    id: string;
    name: string;
    inviteCode: string;
    status: string;
    legsPerMember: number;
    owner: { id: string; name: string };
    memberCount: number;
    members: GroupMember[];
  };
  leaderboard: GroupLeaderboardEntry[];
  activeRound: {
    id: string;
    status: RoundStatus;
    legsPerMember: number;
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
  dateLabel: string;
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
  dateLabel: string;
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
  averagePointsPerLeg: number | null;
  winRate: number | null;
  averageOdds: number | null;
  netAccaPlGbp: number;
};

export type CategoryInsight = {
  key: string;
  avgPoints: number;
  legs: number;
  netPoints: number;
};

export type UserCategoryStats = {
  favourite: string | null;
  bestWorst: { best: CategoryInsight; worst: CategoryInsight } | null;
};

export type UserStatsGroupBreakdown = {
  groupId: string;
  groupName: string;
  netPoints: number;
  legsPlayed: number;
  settledRounds: number;
  averagePointsPerLeg: number | null;
  winRate: number | null;
  averageOdds: number | null;
  competition: UserCategoryStats;
  market: UserCategoryStats;
  team: UserCategoryStats;
};

export type UserStatsChartPoint = {
  roundNumber: number;
  label: string;
  dateLabel: string;
  roundPoints: number;
  cumulativePoints: number;
  groupName: string;
};

export type UserStatsResponse = {
  summary: UserStatsSummary;
  chart: UserStatsChartPoint[];
  groups: UserStatsGroupBreakdown[];
  competition: UserCategoryStats;
  market: UserCategoryStats;
  team: UserCategoryStats;
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
  averagePointsPerLeg: number | null;
  legsPlayed: number;
  winRate: number | null;
  averageOdds: number | null;
  bestLeg: LegHighlight | null;
  worstLeg: LegHighlight | null;
};

export type MemberCategoryStats = {
  favourite: string | null;
  bestWorst: { best: CategoryInsight; worst: CategoryInsight } | null;
};

export type MemberStatsResponse = {
  userId: string;
  name: string;
  summary: MemberStatsSummary;
  chart: {
    roundNumber: number;
    label: string;
    dateLabel: string;
    roundPoints: number;
    cumulativePoints: number;
  }[];
  competition: MemberCategoryStats;
  market: MemberCategoryStats;
  team: MemberCategoryStats;
};
