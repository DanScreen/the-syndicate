import { POINTS, DEFAULT_STAKE_GBP } from "@the-syndicate/shared";
import type { LegOutcome } from "@the-syndicate/shared";
import { calculateCombinedOdds } from "./odds/betslip-links";

export function pointsForOutcome(outcome: LegOutcome): number {
  switch (outcome) {
    case "won":
      return POINTS.LEG_WON;
    case "void":
      return POINTS.LEG_VOID;
    default:
      return POINTS.LEG_LOST;
  }
}

export function calculateGroupProfitLoss(
  legOutcomes: LegOutcome[],
  combinedOdds: number,
  stakeGbp = DEFAULT_STAKE_GBP
): number {
  const allWon = legOutcomes.every((o) => o === "won" || o === "void");
  const anyLost = legOutcomes.some((o) => o === "lost");

  if (anyLost) return -stakeGbp;
  if (allWon) return Number((stakeGbp * combinedOdds - stakeGbp).toFixed(2));
  return -stakeGbp;
}

export function deriveCombinedOddsFromLegs(legs: { odds: number }[]): number {
  return calculateCombinedOdds(legs.map((l) => l.odds));
}
