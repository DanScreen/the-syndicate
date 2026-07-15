import { memberAccaLegPoints } from "@tiki-acca/shared";
import type { LegOutcome } from "@tiki-acca/shared";
import { DEFAULT_STAKE_GBP } from "@tiki-acca/shared";
import { calculateCombinedOdds } from "./odds/betslip-links";

export function pointsForMemberLeg(
  accaOutcomes: LegOutcome[],
  legOutcome: LegOutcome,
  legOdds: number
): number {
  return memberAccaLegPoints(accaOutcomes, legOutcome, legOdds);
}

export function calculateGroupProfitLoss(
  legOutcomes: LegOutcome[],
  combinedOdds: number,
  stakeGbp = DEFAULT_STAKE_GBP
): number {
  const anyLost = legOutcomes.some((o) => o === "lost");
  if (anyLost) return -stakeGbp;

  const allWon = legOutcomes.every((o) => o === "won" || o === "void");
  if (allWon) return Number((stakeGbp * combinedOdds - stakeGbp).toFixed(2));

  // Still pending and no loss yet — not a final P/L.
  return 0;
}

export function deriveCombinedOddsFromLegs(legs: { odds: number }[]): number {
  return calculateCombinedOdds(legs.map((l) => l.odds));
}
