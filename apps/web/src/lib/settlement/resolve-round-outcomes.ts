import { postLegResultMessage } from "@/lib/chat/system-messages";
import { getMatchResultForLegFromDb } from "@/lib/results/match-store";
import { resolveLegOutcome } from "@/lib/results/resolve-leg";
import { prisma } from "@tiki-acca/database";
import type { Leg } from "@prisma/client";
import type { LegOutcome } from "@tiki-acca/shared";

export type PendingLeg = { legId: string; reason: string };

export type ResolveRoundResult =
  | { ready: true; outcomeMap: Map<string, LegOutcome> }
  | { ready: false; pending: PendingLeg[]; resolved: Map<string, LegOutcome> };

export async function resolveRoundOutcomes(
  legs: Leg[]
): Promise<ResolveRoundResult> {
  const outcomeMap = new Map<string, LegOutcome>();
  const pending: PendingLeg[] = [];

  for (const leg of legs) {
    const matchData = await getMatchResultForLegFromDb({
      id: leg.id,
      matchId: leg.matchId,
      competitionId: leg.competitionId,
      homeTeam: leg.homeTeam,
      awayTeam: leg.awayTeam,
      kickoff: leg.kickoff,
    });

    if (!matchData) {
      pending.push({
        legId: leg.id,
        reason: `No synced match for ${leg.homeTeam} vs ${leg.awayTeam} (${leg.competition})`,
      });
      continue;
    }

    const outcome = resolveLegOutcome(
      { marketType: leg.marketType, selectionId: leg.selectionId },
      matchData.result
    );

    if (!outcome) {
      pending.push({
        legId: leg.id,
        reason:
          matchData.result.status === "FINISHED"
            ? `Could not resolve ${leg.marketType} (${leg.selectionId})`
            : `Match not finished (${matchData.result.status})`,
      });
      continue;
    }

    outcomeMap.set(leg.id, outcome);
  }

  if (pending.length > 0) {
    return { ready: false, pending, resolved: outcomeMap };
  }

  return { ready: true, outcomeMap };
}

/**
 * Update leg outcomes as matches finish.
 * Points for a busted acca may already be partly awarded; unfinished legs
 * keep `pending` until deferred resolution after early settle.
 */
export async function persistResolvableLegOutcomes(
  legs: Leg[],
  outcomeMap: Map<string, LegOutcome>
): Promise<number> {
  let updated = 0;

  for (const leg of legs) {
    const outcome = outcomeMap.get(leg.id);
    if (!outcome || outcome === "pending" || leg.outcome !== "pending") continue;

    // Atomic pending → outcome claim: overlapping cron runs (or a concurrent
    // settlement) match zero rows, so the leg_result chat message posts
    // exactly once, in the same transaction as the claim.
    const claimed = await prisma.$transaction(async (tx) => {
      const claim = await tx.leg.updateMany({
        where: { id: leg.id, outcome: "pending" },
        data: { outcome },
      });
      if (claim.count === 0) return false;
      await postLegResultMessage(tx, leg, outcome);
      return true;
    });

    if (claimed) updated++;
  }

  return updated;
}
