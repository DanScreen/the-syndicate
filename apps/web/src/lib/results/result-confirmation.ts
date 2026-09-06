import { RESULT_CONFIRMATION_MS } from "@tiki-acca/shared";

const TERMINAL_VOID_STATUSES = new Set([
  "POSTPONED",
  "CANCELLED",
  "SUSPENDED",
  "AWARDED",
]);

export type MatchConfirmationFields = {
  status: string;
  finishedAt: Date | null;
  scoreLocked: boolean;
};

/** Statuses that mean the match is done (or abandoned) for settlement purposes. */
export function isTerminalMatchStatus(status: string): boolean {
  return status === "FINISHED" || TERMINAL_VOID_STATUSES.has(status);
}

/**
 * True when auto-settle may write leg outcomes from this match.
 * Admin-locked scores confirm immediately; otherwise we wait
 * RESULT_CONFIRMATION_MS after first observing a terminal status so the
 * feed can correct provisional FT scores (disallowed goals / VAR).
 */
export function isMatchResultConfirmed(
  match: MatchConfirmationFields,
  now: Date = new Date()
): boolean {
  if (match.scoreLocked) return true;
  if (!isTerminalMatchStatus(match.status)) return false;
  if (TERMINAL_VOID_STATUSES.has(match.status)) return true;
  if (!match.finishedAt) return false;
  return now.getTime() - match.finishedAt.getTime() >= RESULT_CONFIRMATION_MS;
}

/** Remaining ms until confirmation, or 0 when already confirmed / not finished. */
export function resultConfirmationRemainingMs(
  match: MatchConfirmationFields,
  now: Date = new Date()
): number {
  if (isMatchResultConfirmed(match, now)) return 0;
  if (!match.finishedAt || match.status !== "FINISHED") return RESULT_CONFIRMATION_MS;
  return Math.max(0, RESULT_CONFIRMATION_MS - (now.getTime() - match.finishedAt.getTime()));
}
