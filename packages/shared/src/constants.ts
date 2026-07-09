export const POINTS = {
  /** @deprecated Use legPointsForOutcome() — unit-stake model */
  LEG_WON: 3,
  /** @deprecated Use legPointsForOutcome() — unit-stake model */
  LEG_VOID: 1,
  /** @deprecated Use legPointsForOutcome() — unit-stake model */
  LEG_LOST: 0,
} as const;

export const DEFAULT_STAKE_GBP = 10;

export const GROUP_STATUSES = ["open", "collecting", "locked", "settled"] as const;

export const ROUND_STATUSES = ["collecting", "locked", "settled"] as const;

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
  "draw_no_bet",
] as const;
