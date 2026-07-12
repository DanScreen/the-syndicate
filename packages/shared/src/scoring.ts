import type { LegOutcome } from "./types";

/** Per-leg unit stake when the syndicate acca wins (or leg void). */
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
 * Group acca points for one settled round — one unit stake on the combined acca.
 * Used for group stats, charts, and round history (not per-member leaderboard).
 */
export function groupAccaRoundPoints(
  outcomes: LegOutcome[],
  combinedOdds: number
): number {
  if (!accaSucceeded(outcomes)) return -1;
  return Number((combinedOdds - 1).toFixed(2));
}

/**
 * Member points for one leg in a settled acca round.
 * - Acca won: `odds − 1` on a won leg, `0` on void (same rule as unit-stake singles)
 * - Acca lost: `−1` per participating member (void leg → `0`)
 *
 * Group total (`groupAccaRoundPoints`) is not split — member totals will not sum to it on wins.
 */
export function memberAccaLegPoints(
  accaOutcomes: LegOutcome[],
  legOutcome: LegOutcome,
  legOdds: number
): number {
  if (legOutcome === "pending") return 0;

  if (!accaSucceeded(accaOutcomes)) {
    return legOutcome === "void" ? 0 : -1;
  }

  return legPointsForOutcome(legOutcome, legOdds);
}

/** @deprecated Use `groupAccaRoundPoints` and `memberAccaLegPoints` instead. */
export function accaRoundPoints(
  outcomes: LegOutcome[],
  combinedOdds: number,
  memberCount: number
): { roundTotal: number; perMember: number } {
  const roundTotal = groupAccaRoundPoints(outcomes, combinedOdds);
  if (!accaSucceeded(outcomes)) {
    return { roundTotal, perMember: -1 };
  }
  const n = Math.max(memberCount, 1);
  return { roundTotal, perMember: Number((roundTotal / n).toFixed(2)) };
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
