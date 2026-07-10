import { getMatchResultForLegFromDb } from "@/lib/results/match-store";
import { resolveLegOutcome } from "@/lib/results/resolve-leg";
import { prisma } from "@the-syndicate/database";
import type { Leg } from "@prisma/client";
import type { LegOutcome } from "@the-syndicate/shared";

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

/** Update leg outcomes as matches finish; points are awarded only when the round settles. */
export async function persistResolvableLegOutcomes(
  legs: Leg[],
  outcomeMap: Map<string, LegOutcome>
): Promise<number> {
  let updated = 0;

  for (const leg of legs) {
    const outcome = outcomeMap.get(leg.id);
    if (!outcome || leg.outcome !== "pending") continue;

    await prisma.leg.update({
      where: { id: leg.id },
      data: { outcome },
    });
    updated++;
  }

  return updated;
}
