import type { LegHighlight } from "./api-types";
import type { LegOutcome } from "./types";

/** Per-leg unit stake when the group acca wins (or leg void). */
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

/** Acca is bust as soon as any leg loses — remaining legs may still be pending. */
export function accaHasLostLeg(outcomes: LegOutcome[]): boolean {
  return outcomes.some((o) => o === "lost");
}

/**
 * Ready to settle the round: every leg resolved as won/void (acca win),
 * or at least one leg lost (acca bust — unfinished legs can resolve later).
 */
export function roundIsSettleable(outcomes: Array<LegOutcome | undefined>): boolean {
  if (outcomes.length === 0) return false;
  if (outcomes.some((o) => o === "lost")) return true;
  return outcomes.every((o) => o === "won" || o === "void");
}

/**
 * Group acca points for one settled round — one unit stake on the combined acca.
 * Used for group stats, charts, and round history (not per-member leaderboard).
 * A known lost leg scores −1 even while later fixtures are still pending.
 */
export function groupAccaRoundPoints(
  outcomes: LegOutcome[],
  combinedOdds: number
): number {
  if (accaHasLostLeg(outcomes)) return -1;
  if (!accaSucceeded(outcomes)) return 0;
  return Number((combinedOdds - 1).toFixed(2));
}

/**
 * Member points for one leg in a settled acca round.
 * - Acca won: `odds − 1` on a won leg, `0` on void (same rule as unit-stake singles)
 * - Acca lost: `−1` per participating member (void leg → `0`)
 * - Still-pending after an early loss: `0` until the leg resolves, then the lost-acca rule
 *
 * Group total (`groupAccaRoundPoints`) is not split — member totals will not sum to it on wins.
 */
export function memberAccaLegPoints(
  accaOutcomes: LegOutcome[],
  legOutcome: LegOutcome,
  legOdds: number
): number {
  if (legOutcome === "pending") return 0;

  if (accaHasLostLeg(accaOutcomes) || !accaSucceeded(accaOutcomes)) {
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

export type PointsTone = "positive" | "negative" | "neutral";

export function pointsTone(points: number): PointsTone {
  if (points > 0) return "positive";
  if (points < 0) return "negative";
  return "neutral";
}

/**
 * Colour for an individual’s pick result — independent of group acca P/L.
 * On a lost acca a member can still have a won leg (points −1) and should read green.
 */
export function pointsToneFromOutcome(outcome: string): PointsTone {
  if (outcome === "won") return "positive";
  if (outcome === "lost") return "negative";
  return "neutral";
}

/** Unit-stake points × stake (£) = profit/loss in pounds. */
export function profitFromPoints(points: number, stakeGbp: number): number {
  return Number((points * stakeGbp).toFixed(2));
}

export function formatProfitGbp(amount: number): string {
  const sign = amount >= 0 ? "+" : "";
  return `${sign}£${Math.abs(amount).toFixed(2)}`;
}

type LegForHighlight = {
  outcome: string;
  odds: number;
  homeTeam: string;
  awayTeam: string;
  marketLabel: string;
  selectionLabel: string;
  competition: string;
};

export function legToHighlight(leg: LegForHighlight): LegHighlight {
  return {
    odds: Number(leg.odds.toFixed(2)),
    homeTeam: leg.homeTeam,
    awayTeam: leg.awayTeam,
    marketLabel: leg.marketLabel,
    selectionLabel: leg.selectionLabel,
    competition: leg.competition,
  };
}

/** Best = highest-odds won leg; worst = lowest-odds lost leg. */
export function bestWorstLegHighlights(legs: LegForHighlight[]): {
  bestLeg: LegHighlight | null;
  worstLeg: LegHighlight | null;
} {
  const won = legs.filter((l) => l.outcome === "won");
  const lost = legs.filter((l) => l.outcome === "lost");

  const best =
    won.length > 0 ? won.reduce((a, b) => (a.odds >= b.odds ? a : b)) : null;
  const worst =
    lost.length > 0 ? lost.reduce((a, b) => (a.odds <= b.odds ? a : b)) : null;

  return {
    bestLeg: best ? legToHighlight(best) : null,
    worstLeg: worst ? legToHighlight(worst) : null,
  };
}

export function formatLegHighlight(leg: LegHighlight): string {
  return `${leg.homeTeam} vs ${leg.awayTeam} · ${leg.marketLabel}: ${leg.selectionLabel}`;
}
