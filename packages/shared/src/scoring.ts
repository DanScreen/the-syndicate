import type { LegOutcome } from "./types";

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

export function formatLegPoints(points: number): string {
  return Number(points.toFixed(2)).toString();
}
