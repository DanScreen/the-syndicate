import type {
  GroupSummaryActiveLeg,
  GroupSummaryYourLeg,
} from "@tiki-acca/shared";

type LegRow = {
  userId: string;
  selectionLabel: string;
  marketLabel: string;
  homeTeam: string;
  awayTeam: string;
  odds: number;
  outcome: string;
  kickoff?: Date;
  user?: { id: string; name: string } | null;
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

export function activeLegsInRound(
  legs: LegRow[],
  currentUserId?: string
): GroupSummaryActiveLeg[] {
  return [...legs]
    .sort((a, b) => {
      const aKick = a.kickoff?.getTime() ?? 0;
      const bKick = b.kickoff?.getTime() ?? 0;
      if (aKick !== bKick) return aKick - bKick;
      if (currentUserId) {
        if (a.userId === currentUserId && b.userId !== currentUserId) return -1;
        if (b.userId === currentUserId && a.userId !== currentUserId) return 1;
      }
      return (a.user?.name ?? "").localeCompare(b.user?.name ?? "");
    })
    .map((leg) => ({
      userId: leg.userId,
      userName: leg.user?.name ?? "Member",
      selectionLabel: leg.selectionLabel,
      marketLabel: leg.marketLabel,
      homeTeam: leg.homeTeam,
      awayTeam: leg.awayTeam,
      odds: leg.odds,
      outcome: leg.outcome,
    }));
}
