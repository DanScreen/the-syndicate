import {
  isLegOrientationDirect,
  isLegOrientationReversed,
} from "@/lib/results/football-data";
import type { ObservedStats } from "@/lib/results/consensus";
import { areMatchStatsConfirmed } from "@/lib/results/result-confirmation";
import type { MatchResult, ScorePair } from "@/lib/results/resolve-leg";
import { prisma } from "@tiki-acca/database";
import type { Match } from "@prisma/client";

const VOID_STATUSES = new Set(["POSTPONED", "CANCELLED", "SUSPENDED", "AWARDED"]);

function kickoffDayBounds(kickoff: Date): { start: Date; end: Date } {
  const day = kickoff.toISOString().slice(0, 10);
  return {
    start: new Date(`${day}T00:00:00.000Z`),
    end: new Date(`${day}T23:59:59.999Z`),
  };
}

/**
 * Canonical Match → settlement input (Match orientation). Stats are included
 * only once confirmed, so corners legs wait for STATS_CONFIRMATION_MS.
 */
export function dbMatchToResult(match: Match, now: Date = new Date()): MatchResult | null {
  if (VOID_STATUSES.has(match.status)) {
    return { homeGoals: 0, awayGoals: 0, status: match.status };
  }

  const halfTime: ScorePair | null =
    match.homeGoalsHt !== null && match.awayGoalsHt !== null
      ? { home: match.homeGoalsHt, away: match.awayGoalsHt }
      : null;
  const stats = areMatchStatsConfirmed(match, now)
    ? { corners: (match.stats as ObservedStats | null)?.corners ?? null }
    : null;

  return {
    homeGoals: match.homeGoals ?? 0,
    awayGoals: match.awayGoals ?? 0,
    status: match.status,
    extraTime: match.wentToExtraTime,
    halfTime,
    stats,
  };
}

function swapPair(pair: ScorePair | null | undefined): ScorePair | null | undefined {
  return pair ? { home: pair.away, away: pair.home } : pair;
}

/** Map a Match-orientation result to the leg's home/away; null if teams don't match. */
export function alignResultToLeg(
  result: MatchResult,
  match: { homeTeam: string; awayTeam: string },
  leg: { homeTeam: string; awayTeam: string }
): MatchResult | null {
  if (isLegOrientationDirect(match.homeTeam, match.awayTeam, leg.homeTeam, leg.awayTeam)) {
    return result;
  }
  if (isLegOrientationReversed(match.homeTeam, match.awayTeam, leg.homeTeam, leg.awayTeam)) {
    return {
      ...result,
      homeGoals: result.awayGoals,
      awayGoals: result.homeGoals,
      halfTime: swapPair(result.halfTime),
      stats: result.stats ? { corners: swapPair(result.stats.corners) } : result.stats,
    };
  }
  return null;
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
  return alignResultToLeg(base, match, leg);
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
