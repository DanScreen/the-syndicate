import { reconcileMatchLegOutcomes } from "@/lib/results/reconcile-match-legs";
import { prisma } from "@tiki-acca/database";

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
      scoreStableSince: now,
      lastSyncedAt: now,
    },
  });

  const reconciled = await reconcileMatchLegOutcomes(match.id);

  return {
    matchId: match.id,
    homeGoals: match.homeGoals ?? input.homeGoals,
    awayGoals: match.awayGoals ?? input.awayGoals,
    status: match.status,
    scoreLocked: match.scoreLocked,
    legsCorrected: reconciled.legsCorrected,
    legsResolved: reconciled.legsResolved,
    roundsSettled: reconciled.roundsSettled,
  };
}
