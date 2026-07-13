import type { GroupSummaryYourLeg } from "@the-syndicate/shared";

type LegRow = {
  userId: string;
  selectionLabel: string;
  marketLabel: string;
  homeTeam: string;
  awayTeam: string;
  odds: number;
  outcome: string;
};

export function yourLegInRound(
  legs: LegRow[],
  userId: string
): GroupSummaryYourLeg | null {
  const leg = legs.find((l) => l.userId === userId);
  if (!leg) return null;
  return {
    selectionLabel: leg.selectionLabel,
    marketLabel: leg.marketLabel,
    homeTeam: leg.homeTeam,
    awayTeam: leg.awayTeam,
    odds: leg.odds,
    outcome: leg.outcome,
  };
}
