import type { LegOutcome } from "./types";

/** @deprecated Per-leg unit stake — use acca scoring for settled rounds. */
export function legPointsForOutcome(outcome: LegOutcome, odds: number): number {
  switch (outcome) {
    case "won":
      return Number((odds - 1).toFixed(2));
    case "void":
      return 0;
    case "lost":
      return -1;
    default:
      return 0;
  }
}

/** Acca wins when every leg is won or void (no losses). */
export function accaSucceeded(outcomes: LegOutcome[]): boolean {
  return outcomes.length > 0 && outcomes.every((o) => o === "won" || o === "void");
}

/**
 * Syndicate acca points (unit stake on the combined acca):
 * - Win: group total = combinedOdds − 1, split equally per member
 * - Loss: −1 per member (each staked one unit on the acca)
 */
export function accaRoundPoints(
  outcomes: LegOutcome[],
  combinedOdds: number,
  memberCount: number
): { roundTotal: number; perMember: number } {
  const n = Math.max(memberCount, 1);

  if (!accaSucceeded(outcomes)) {
    return { roundTotal: Number((-n).toFixed(2)), perMember: -1 };
  }

  const roundTotal = Number((combinedOdds - 1).toFixed(2));
  const perMember = Number((roundTotal / n).toFixed(2));
  return { roundTotal, perMember };
}

export function formatLegPoints(points: number): string {
  return Number(points.toFixed(2)).toString();
}

/** Unit-stake points × stake (£) = profit/loss in pounds. */
export function profitFromPoints(points: number, stakeGbp: number): number {
  return Number((points * stakeGbp).toFixed(2));
}

export function formatProfitGbp(amount: number): string {
  const sign = amount >= 0 ? "+" : "";
  return `${sign}£${Math.abs(amount).toFixed(2)}`;
}
