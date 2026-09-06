import { tryAutoSettleRound } from "@/lib/settlement/auto-settle-round";
import { correctLegOutcome } from "@/lib/settlement/correct-leg-outcome";
import { applyDeferredLegOutcome } from "@/lib/settlement/apply-round-settlement";
import { persistResolvableLegOutcomes } from "@/lib/settlement/resolve-round-outcomes";
import { resolveLegOutcome } from "@/lib/results/resolve-leg";
import { dbMatchToResult } from "@/lib/results/match-store";
import {
  alignGoalsToLeg,
  isLegOrientationDirect,
  isLegOrientationReversed,
} from "@/lib/results/football-data";
import { prisma } from "@tiki-acca/database";
import type { LegOutcome } from "@tiki-acca/shared";

export type OverrideMatchScoreInput = {
  homeGoals: number;
  awayGoals: number;
  status?: string;
  lockScore?: boolean;
};

/**
 * Admin score override: write the corrected FT score, lock it against the
 * feed, then re-resolve every linked leg (correcting wrong outcomes and
 * settling newly-ready rounds).
 */
export async function overrideMatchScore(
  matchId: string,
  input: OverrideMatchScoreInput
): Promise<{
  matchId: string;
  homeGoals: number;
  awayGoals: number;
  status: string;
  scoreLocked: boolean;
  legsCorrected: number;
  legsResolved: number;
  roundsSettled: number;
}> {
  const status = input.status ?? "FINISHED";
  const lockScore = input.lockScore ?? true;
  const now = new Date();

  const match = await prisma.match.update({
    where: { id: matchId },
    data: {
      homeGoals: input.homeGoals,
      awayGoals: input.awayGoals,
      status,
      scoreLocked: lockScore,
      finishedAt: now,
      lastSyncedAt: now,
    },
    include: {
      legs: {
        include: { round: true },
      },
    },
  });

  // Attach legs that match by team + kickoff day but never got matchId linked.
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

  const legs = [
    ...match.legs,
    ...unlinked.map((l) => ({ ...l, matchId: match.id })),
  ];
  const byId = new Map(legs.map((l) => [l.id, l]));
  const uniqueLegs = [...byId.values()];

  let legsCorrected = 0;
  let legsResolved = 0;
  const affectedRoundIds = new Set<string>();

  for (const leg of uniqueLegs) {
    if (leg.round.status !== "locked" && leg.round.status !== "settled") continue;

    const base = dbMatchToResult(match);
    if (!base) continue;
    const aligned = alignGoalsToLeg(
      base.homeGoals,
      base.awayGoals,
      base.status,
      match.homeTeam,
      match.awayTeam,
      leg.homeTeam,
      leg.awayTeam
    );
    if (!aligned) continue;

    const outcome = resolveLegOutcome(
      { marketType: leg.marketType, selectionId: leg.selectionId },
      aligned
    );
    if (!outcome || outcome === "pending") continue;

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
    homeGoals: match.homeGoals ?? input.homeGoals,
    awayGoals: match.awayGoals ?? input.awayGoals,
    status: match.status,
    scoreLocked: match.scoreLocked,
    legsCorrected,
    legsResolved,
    roundsSettled,
  };
}
