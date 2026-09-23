import {
  RESULT_CONFIRMATION_MAX_MS,
  RESULT_CONFIRMATION_MS,
  STATS_CONFIRMATION_MS,
} from "@tiki-acca/shared";

const TERMINAL_VOID_STATUSES = new Set([
  "POSTPONED",
  "CANCELLED",
  "SUSPENDED",
  "AWARDED",
]);

export type MatchConfirmationFields = {
  status: string;
  finishedAt: Date | null;
  scoreStableSince?: Date | null;
  scoreLocked: boolean;
  /** Consensus outcome; `conflict` / `abstain` hold auto-settle. */
  resultSource?: string | null;
};

/** Providers disagree, or none could give a 90' score — an admin must decide. */
export function isResultHeldForReview(match: MatchConfirmationFields): boolean {
  if (match.scoreLocked) return false;
  return match.resultSource === "conflict" || match.resultSource === "abstain";
}

/** Statuses that mean the match is done (or abandoned) for settlement purposes. */
export function isTerminalMatchStatus(status: string): boolean {
  return status === "FINISHED" || TERMINAL_VOID_STATUSES.has(status);
}

/**
 * True when auto-settle may write leg outcomes from this match.
 * Admin-locked scores confirm immediately; otherwise we wait until the FT
 * score has been stable for RESULT_CONFIRMATION_MS (each feed score change
 * resets the clock), capped by RESULT_CONFIRMATION_MAX_MS from first FINISHED.
 */
export function isMatchResultConfirmed(
  match: MatchConfirmationFields,
  now: Date = new Date()
): boolean {
  if (match.scoreLocked) return true;
  if (isResultHeldForReview(match)) return false;
  if (!isTerminalMatchStatus(match.status)) return false;
  if (TERMINAL_VOID_STATUSES.has(match.status)) return true;
  if (!match.finishedAt) return false;

  const stableSince = match.scoreStableSince ?? match.finishedAt;
  const stableLongEnough =
    now.getTime() - stableSince.getTime() >= RESULT_CONFIRMATION_MS;
  const maxWaitElapsed =
    now.getTime() - match.finishedAt.getTime() >= RESULT_CONFIRMATION_MAX_MS;
  return stableLongEnough || maxWaitElapsed;
}

/** Remaining ms until confirmation, or 0 when already confirmed / not finished. */
export function resultConfirmationRemainingMs(
  match: MatchConfirmationFields,
  now: Date = new Date()
): number {
  if (isMatchResultConfirmed(match, now)) return 0;
  if (!match.finishedAt || match.status !== "FINISHED") {
    return RESULT_CONFIRMATION_MS;
  }

  const stableSince = match.scoreStableSince ?? match.finishedAt;
  const untilStable =
    RESULT_CONFIRMATION_MS - (now.getTime() - stableSince.getTime());
  const untilMax =
    RESULT_CONFIRMATION_MAX_MS - (now.getTime() - match.finishedAt.getTime());
  return Math.max(0, Math.min(untilStable, untilMax));
}

/** True when home/away goals differ (null-safe). */
export function matchScoreChanged(
  previous: { homeGoals: number | null; awayGoals: number | null },
  next: { homeGoals: number | null; awayGoals: number | null }
): boolean {
  return previous.homeGoals !== next.homeGoals || previous.awayGoals !== next.awayGoals;
}

/**
 * True when stats-based legs (corners) may settle: the result is confirmed and
 * the stats blob has been unchanged for STATS_CONFIRMATION_MS (providers
 * revise stats for longer than goals).
 */
export function areMatchStatsConfirmed(
  match: MatchConfirmationFields & {
    stats?: unknown;
    statsStableSince?: Date | null;
  },
  now: Date = new Date()
): boolean {
  if (!match.stats || !match.statsStableSince) return false;
  if (match.status !== "FINISHED") return false;
  if (!isMatchResultConfirmed(match, now)) return false;
  return now.getTime() - match.statsStableSince.getTime() >= STATS_CONFIRMATION_MS;
}
