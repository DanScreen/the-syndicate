import { prisma } from "@tiki-acca/database";
import type { LegOutcome } from "@tiki-acca/shared";
import { applyDeferredLegOutcome } from "./apply-round-settlement";
import { persistResolvableLegOutcomes } from "./resolve-round-outcomes";

/**
 * An outcome is a fact about a (fixture, market, selection) — not about a leg.
 * When two groups back the same selection they get separate Leg rows, but the
 * real world only decides it once. Without propagation an admin is asked the
 * same question once per group, and nothing stops them answering it two
 * different ways, leaving contradictory outcomes for the same selection.
 */
export type ResolvedSelection = {
  legId: string;
  fixtureId: string;
  marketType: string;
  selectionId: string;
  outcome: LegOutcome;
};

export type SelectionPropagationResult = {
  /** Pending legs in other rounds that took the same outcome. */
  legsUpdated: number;
  /** Rounds touched — locked ones may now be fully resolved. */
  affectedRoundIds: string[];
};

function selectionKey(s: {
  fixtureId: string;
  marketType: string;
  selectionId: string;
}): string {
  return `${s.fixtureId}::${s.marketType}::${s.selectionId}`;
}

/**
 * Applies each resolved selection to every *other* pending leg on the same
 * selection. Settled rounds go through `applyDeferredLegOutcome` so deferred
 * points are awarded; locked rounds get the same atomic pending → outcome claim
 * (and single chat message) the results cron uses.
 *
 * Returns the rounds it touched. Callers settle those separately — propagation
 * only establishes the facts.
 */
export async function propagateSelectionOutcomes(
  resolved: ResolvedSelection[]
): Promise<SelectionPropagationResult> {
  const outcomeByKey = new Map<string, LegOutcome>();
  const sourceLegIds: string[] = [];

  for (const selection of resolved) {
    sourceLegIds.push(selection.legId);
    if (selection.outcome === "pending") continue;
    outcomeByKey.set(selectionKey(selection), selection.outcome);
  }

  if (outcomeByKey.size === 0) {
    return { legsUpdated: 0, affectedRoundIds: [] };
  }

  const matches = await prisma.leg.findMany({
    where: {
      outcome: "pending",
      id: { notIn: sourceLegIds },
      // Open rounds are still being built and lock at first kickoff; only
      // rounds already in the settlement pipeline should be written to.
      round: { status: { in: ["locked", "settled"] } },
      OR: [...outcomeByKey.keys()].map((key) => {
        const [fixtureId, marketType, selectionId] = key.split("::") as [
          string,
          string,
          string,
        ];
        return { fixtureId, marketType, selectionId };
      }),
    },
    include: { round: { select: { id: true, status: true } } },
  });

  if (matches.length === 0) {
    return { legsUpdated: 0, affectedRoundIds: [] };
  }

  const affectedRoundIds = new Set<string>();
  let legsUpdated = 0;

  const lockedByRound = new Map<string, typeof matches>();

  for (const leg of matches) {
    const outcome = outcomeByKey.get(selectionKey(leg));
    if (!outcome) continue;

    if (leg.round.status === "settled") {
      const result = await applyDeferredLegOutcome(leg.round.id, leg.id, outcome);
      if (result.awarded) {
        legsUpdated += 1;
        affectedRoundIds.add(leg.round.id);
      }
      continue;
    }

    const bucket = lockedByRound.get(leg.round.id) ?? [];
    bucket.push(leg);
    lockedByRound.set(leg.round.id, bucket);
  }

  for (const [roundId, legs] of lockedByRound) {
    const outcomeMap = new Map<string, LegOutcome>();
    for (const leg of legs) {
      const outcome = outcomeByKey.get(selectionKey(leg));
      if (outcome) outcomeMap.set(leg.id, outcome);
    }

    const updated = await persistResolvableLegOutcomes(legs, outcomeMap);
    if (updated > 0) {
      legsUpdated += updated;
      affectedRoundIds.add(roundId);
    }
  }

  return { legsUpdated, affectedRoundIds: [...affectedRoundIds] };
}
