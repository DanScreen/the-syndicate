import { tryAutoSettleRound } from "@/lib/settlement/auto-settle-round";
import { correctLegOutcome } from "@/lib/settlement/correct-leg-outcome";
import { applyDeferredLegOutcome } from "@/lib/settlement/apply-round-settlement";
import { persistResolvableLegOutcomes } from "@/lib/settlement/resolve-round-outcomes";
import { resolveLegOutcome } from "@/lib/results/resolve-leg";
import { alignResultToLeg, dbMatchToResult } from "@/lib/results/match-store";
import {
  isLegOrientationDirect,
  isLegOrientationReversed,
} from "@/lib/results/football-data";
import { isResultHeldForReview } from "@/lib/results/result-confirmation";
import { prisma } from "@tiki-acca/database";
import { RESULT_RECONCILE_MS, type LegOutcome } from "@tiki-acca/shared";
import type { Leg, Match, Round } from "@prisma/client";

type LegWithRound = Leg & { round: Round };

export type ReconcileMatchLegsResult = {
  matchId: string;
  legsCorrected: number;
  legsResolved: number;
  roundsSettled: number;
};

function sameUtcDay(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

async function attachUnlinkedLegs(
  match: Match
): Promise<LegWithRound[]> {
  const day = match.kickoff.toISOString().slice(0, 10);
  const dayStart = new Date(`${day}T00:00:00.000Z`);
  const dayEnd = new Date(`${day}T23:59:59.999Z`);
  const candidates = await prisma.leg.findMany({
    where: {
      matchId: null,
      competitionId: match.competitionId,
      kickoff: { gte: dayStart, lte: dayEnd },
      round: { status: { in: ["locked", "settled"] } },
    },
    include: { round: true },
  });
  const unlinked = candidates.filter(
    (leg) =>
      isLegOrientationDirect(
        match.homeTeam,
        match.awayTeam,
        leg.homeTeam,
        leg.awayTeam
      ) ||
      isLegOrientationReversed(
        match.homeTeam,
        match.awayTeam,
        leg.homeTeam,
        leg.awayTeam
      )
  );

  if (unlinked.length > 0) {
    await prisma.leg.updateMany({
      where: { id: { in: unlinked.map((l) => l.id) } },
      data: { matchId: match.id },
    });
  }

  return unlinked.map((l) => ({ ...l, matchId: match.id }));
}

/**
 * Re-resolve every locked/settled leg linked to this match against the current
 * Match score. Corrects wrong outcomes (points delta + chat), resolves pending
 * deferred legs, and settles newly-ready locked rounds.
 *
 * Used by admin score override and by the sync cron when the feed corrects a
 * provisional FT score (disallowed goals / VAR) after outcomes were written.
 */
export async function reconcileMatchLegOutcomes(
  matchId: string
): Promise<ReconcileMatchLegsResult> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      legs: {
        include: { round: true },
      },
    },
  });

  if (!match) {
    return {
      matchId,
      legsCorrected: 0,
      legsResolved: 0,
      roundsSettled: 0,
    };
  }

  const unlinked = await attachUnlinkedLegs(match);
  const byId = new Map<string, LegWithRound>();
  for (const leg of match.legs) byId.set(leg.id, leg);
  for (const leg of unlinked) byId.set(leg.id, leg);
  const uniqueLegs = [...byId.values()];

  let legsCorrected = 0;
  let legsResolved = 0;
  const affectedRoundIds = new Set<string>();

  for (const leg of uniqueLegs) {
    if (leg.round.status !== "locked" && leg.round.status !== "settled") continue;
    // A void pick whose match was rescheduled to another day stays void.
    if (leg.outcome === "void" && !sameUtcDay(leg.kickoff, match.kickoff)) continue;

    const base = dbMatchToResult(match);
    if (!base) continue;
    const aligned = alignResultToLeg(base, match, leg);
    if (!aligned) continue;

    const outcome = resolveLegOutcome(
      {
        marketType: leg.marketType,
        selectionId: leg.selectionId,
        homeTeam: leg.homeTeam,
        awayTeam: leg.awayTeam,
      },
      aligned
    );
    if (!outcome || outcome === "pending") continue;

    // First-write is provisional until the score is confirmed —
    // tryAutoSettleRound only settles the round from confirmed results.
    // Sources in conflict hold even the first write for an admin; corrections
    // of already written outcomes always apply.
    if (leg.outcome === "pending" && isResultHeldForReview(match)) {
      continue;
    }

    if (leg.outcome === "pending") {
      if (leg.round.status === "settled") {
        const result = await applyDeferredLegOutcome(leg.roundId, leg.id, outcome);
        if (result.awarded) legsResolved += 1;
      } else {
        const updated = await persistResolvableLegOutcomes(
          [leg],
          new Map<string, LegOutcome>([[leg.id, outcome]])
        );
        legsResolved += updated;
      }
      affectedRoundIds.add(leg.roundId);
      continue;
    }

    if (leg.outcome !== outcome) {
      const result = await correctLegOutcome(leg.id, outcome);
      if (result.corrected) legsCorrected += 1;
      affectedRoundIds.add(leg.roundId);
    }
  }

  let roundsSettled = 0;
  for (const roundId of affectedRoundIds) {
    const settle = await tryAutoSettleRound(roundId);
    if (settle.status === "settled") roundsSettled += 1;
  }

  return {
    matchId: match.id,
    legsCorrected,
    legsResolved,
    roundsSettled,
  };
}

export type ReconcileRecentMatchesResult = {
  matchesChecked: number;
  matchesTouched: number;
  legsCorrected: number;
  legsResolved: number;
  roundsSettled: number;
};

/**
 * Cron sweep: for recently finished matches, re-check feed score → leg outcomes.
 * Idempotent — no-ops when outcomes already match the Match row.
 */
export async function reconcileRecentMatchOutcomes(
  now: Date = new Date()
): Promise<ReconcileRecentMatchesResult> {
  const since = new Date(now.getTime() - RESULT_RECONCILE_MS);

  const matches = await prisma.match.findMany({
    where: {
      scoreLocked: false,
      finishedAt: { gte: since },
      status: { in: ["FINISHED", "POSTPONED", "CANCELLED", "SUSPENDED", "AWARDED"] },
      legs: {
        some: {
          round: { status: { in: ["locked", "settled"] } },
        },
      },
    },
    select: { id: true },
  });

  const result: ReconcileRecentMatchesResult = {
    matchesChecked: matches.length,
    matchesTouched: 0,
    legsCorrected: 0,
    legsResolved: 0,
    roundsSettled: 0,
  };

  for (const { id } of matches) {
    const r = await reconcileMatchLegOutcomes(id);
    if (r.legsCorrected > 0 || r.legsResolved > 0 || r.roundsSettled > 0) {
      result.matchesTouched += 1;
    }
    result.legsCorrected += r.legsCorrected;
    result.legsResolved += r.legsResolved;
    result.roundsSettled += r.roundsSettled;
  }

  return result;
}
