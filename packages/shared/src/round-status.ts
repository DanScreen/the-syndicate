import type { RoundStatus } from "./types";

const ROUND_STATUS_BADGES: Record<RoundStatus, string> = {
  open: "Bet Open",
  locked: "Bet Locked",
  settled: "Bet Settled",
};

/** User-facing label for round status badges (current bet, not the group). */
export function formatRoundStatusBadge(status: RoundStatus | string): string {
  if (status in ROUND_STATUS_BADGES) {
    return ROUND_STATUS_BADGES[status as RoundStatus];
  }
  return ROUND_STATUS_BADGES.open;
}

export function isRoundOpen(status: string): boolean {
  return status === "open";
}

export function isRoundLocked(status: string): boolean {
  return status === "locked";
}

export function isRoundSettled(status: string): boolean {
  return status === "settled";
}
