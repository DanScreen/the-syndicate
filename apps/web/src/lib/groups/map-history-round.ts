import type { HistoryLeg, HistoryRound } from "@tiki-acca/shared";

type LegRow = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  kickoff: Date;
  selectionLabel: string;
  marketLabel: string;
  marketType: string;
  odds: number;
  bookmakerName: string;
  outcome: string;
  pointsAwarded: number;
  user: { id: string; name: string };
};

type RoundRow = {
  id: string;
  status: string;
  combinedOdds: number | null;
  lockedAt: Date | null;
  settledAt: Date | null;
  createdAt: Date;
  legs: LegRow[];
};

function mapHistoryLeg(leg: LegRow): HistoryLeg {
  return {
    id: leg.id,
    user: leg.user,
    homeTeam: leg.homeTeam,
    awayTeam: leg.awayTeam,
    competition: leg.competition,
    kickoff: leg.kickoff.toISOString(),
    selectionLabel: leg.selectionLabel,
    marketLabel: leg.marketLabel,
    marketType: leg.marketType,
    odds: leg.odds,
    bookmakerName: leg.bookmakerName,
    outcome: leg.outcome,
    pointsAwarded: leg.pointsAwarded,
  };
}

export function mapHistoryRound(round: RoundRow): HistoryRound {
  const legs = [...round.legs]
    .sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime())
    .map(mapHistoryLeg);

  return {
    id: round.id,
    status: round.status,
    combinedOdds: round.combinedOdds,
    lockedAt: round.lockedAt?.toISOString() ?? null,
    settledAt: round.settledAt?.toISOString() ?? null,
    createdAt: round.createdAt.toISOString(),
    legs,
  };
}
