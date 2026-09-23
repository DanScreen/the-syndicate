export const POINTS = {
  /** @deprecated Use legPointsForOutcome() — unit-stake model */
  LEG_WON: 3,
  /** @deprecated Use legPointsForOutcome() — unit-stake model */
  LEG_VOID: 1,
  /** @deprecated Use legPointsForOutcome() — unit-stake model */
  LEG_LOST: 0,
} as const;

export const DEFAULT_STAKE_GBP = 10;

/**
 * How long a FINISHED score must remain unchanged before auto-settle writes
 * leg outcomes. football-data.org (and similar feeds) sometimes publish a
 * provisional FT score and correct it minutes later (disallowed goals / VAR).
 * Each feed score change resets this stability clock (`Match.scoreStableSince`).
 */
export const RESULT_CONFIRMATION_MS = 60 * 60 * 1000;

/**
 * Hard cap from first FINISHED observation (`Match.finishedAt`). Even if the
 * feed keeps tweaking the score, we confirm once this elapses so settlement
 * cannot stall indefinitely.
 */
export const RESULT_CONFIRMATION_MAX_MS = 4 * 60 * 60 * 1000;

/**
 * How long after first FINISHED we keep re-checking the feed score against
 * already-written leg outcomes. Late VAR / disallowed-goal corrections that
 * land after the stability window still auto-correct points via reconciliation
 * until this horizon expires (admin lock still wins immediately).
 */
export const RESULT_RECONCILE_MS = 24 * 60 * 60 * 1000;

/**
 * Stats-based legs (corners) wait until the provider's match statistics have
 * been unchanged this long after FT. Stats get revised after the whistle more
 * often than scores (docs/specs/odds-and-results-sourcing.md §3.1).
 */
export const STATS_CONFIRMATION_MS = 2 * 60 * 60 * 1000;

/** Owner-selectable legs each member submits per round. */
export const LEGS_PER_MEMBER_OPTIONS = [1, 2, 3] as const;
export type LegsPerMember = (typeof LEGS_PER_MEMBER_OPTIONS)[number];
export const DEFAULT_LEGS_PER_MEMBER: LegsPerMember = 1;

/**
 * Legs a member may submit into a solo (one-member) acca. Capped because most
 * bookmakers limit accumulators to roughly 12–20 selections — beyond that the
 * betslip deeplink is one the user cannot actually place.
 */
export const SOLO_MAX_LEGS = 10;

/** Owner-selectable cap for simultaneous open or locked bets. */
export const MAX_ACTIVE_BETS_OPTIONS = [1, 2, 3, 4, 5] as const;
export type MaxActiveBets = (typeof MAX_ACTIVE_BETS_OPTIONS)[number];
export const DEFAULT_MAX_ACTIVE_BETS: MaxActiveBets = 1;

export const GROUP_STATUSES = ["open", "locked", "settled"] as const;

export const ROUND_STATUSES = ["open", "locked", "settled"] as const;

export const LEG_OUTCOMES = ["pending", "won", "lost", "void"] as const;

export const BOOKMAKERS = [
  { id: "bet365", name: "Bet365", slug: "bet365" },
  { id: "williamhill", name: "William Hill", slug: "williamhill" },
  { id: "paddypower", name: "Paddy Power", slug: "paddypower" },
  { id: "skybet", name: "Sky Bet", slug: "skybet" },
] as const;

export const MARKET_TYPES = [
  "match_winner",
  "both_teams_score",
  "over_under_15",
  "over_under_25",
  "over_under_35",
  "double_chance",
] as const;
