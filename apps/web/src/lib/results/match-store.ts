import {
  alignGoalsToLeg,
  isLegOrientationDirect,
  isLegOrientationReversed,
} from "@/lib/results/football-data";
import type { MatchResult } from "@/lib/results/resolve-leg";
import { prisma } from "@the-syndicate/database";
import type { Match } from "@prisma/client";

const VOID_STATUSES = new Set(["POSTPONED", "CANCELLED", "SUSPENDED", "AWARDED"]);

function kickoffDayBounds(kickoff: Date): { start: Date; end: Date } {
  const day = kickoff.toISOString().slice(0, 10);
  return {
    start: new Date(`${day}T00:00:00.000Z`),
    end: new Date(`${day}T23:59:59.999Z`),
  };
}

export function dbMatchToResult(match: Match): MatchResult | null {
  if (VOID_STATUSES.has(match.status)) {
    return { homeGoals: 0, awayGoals: 0, status: match.status };
  }

  if (match.homeGoals === null || match.awayGoals === null) {
    return { homeGoals: 0, awayGoals: 0, status: match.status };
  }

  return {
    homeGoals: match.homeGoals,
    awayGoals: match.awayGoals,
    status: match.status,
  };
}

export async function findDbMatchForLeg(leg: {
  id?: string;
  matchId?: string | null;
  competitionId: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: Date;
}): Promise<Match | null> {
  if (leg.matchId) {
    return prisma.match.findUnique({ where: { id: leg.matchId } });
  }

  const { start, end } = kickoffDayBounds(leg.kickoff);
  const candidates = await prisma.match.findMany({
    where: {
      competitionId: leg.competitionId,
      kickoff: { gte: start, lte: end },
    },
  });

  return (
    candidates.find((match) =>
      isLegOrientationDirect(match.homeTeam, match.awayTeam, leg.homeTeam, leg.awayTeam)
    ) ??
    candidates.find((match) =>
      isLegOrientationReversed(match.homeTeam, match.awayTeam, leg.homeTeam, leg.awayTeam)
    ) ??
    null
  );
}

function alignDbMatchResultToLeg(
  match: Match,
  leg: { homeTeam: string; awayTeam: string }
): MatchResult | null {
  const base = dbMatchToResult(match);
  if (!base) return null;

  return alignGoalsToLeg(
    base.homeGoals,
    base.awayGoals,
    base.status,
    match.homeTeam,
    match.awayTeam,
    leg.homeTeam,
    leg.awayTeam
  );
}

export async function getMatchResultForLegFromDb(leg: {
  id?: string;
  matchId?: string | null;
  competitionId: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: Date;
}): Promise<{ match: Match; result: MatchResult } | null> {
  const match = await findDbMatchForLeg(leg);
  if (!match) return null;

  const result = alignDbMatchResultToLeg(match, leg);
  if (!result) return null;

  if (leg.id && !leg.matchId) {
    await prisma.leg.update({
      where: { id: leg.id },
      data: { matchId: match.id },
    });
  }

  return { match, result };
}
