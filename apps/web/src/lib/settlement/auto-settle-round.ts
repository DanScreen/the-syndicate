import {
  applyDeferredLegOutcome,
  applyRoundSettlement,
  RoundNotSettleableError,
} from "@/lib/settlement/apply-round-settlement";
import {
  persistResolvableLegOutcomes,
  resolveRoundOutcomes,
} from "@/lib/settlement/resolve-round-outcomes";
import { prisma } from "@tiki-acca/database";
import { roundIsSettleable, type LegOutcome } from "@tiki-acca/shared";

export type AutoSettleRoundResult =
  | { status: "settled"; roundId: string; profitLossGbp: number }
  | { status: "pending"; roundId: string; pending: { legId: string; reason: string }[] }
  | { status: "skipped"; roundId: string; reason: string };

function knownOutcomesForLegs(
  legs: { id: string; outcome: string }[],
  resolved: Map<string, LegOutcome>
): Map<string, LegOutcome> {
  const map = new Map(resolved);
  for (const leg of legs) {
    if (!map.has(leg.id) && leg.outcome !== "pending") {
      map.set(leg.id, leg.outcome as LegOutcome);
    }
  }
  return map;
}

export async function tryAutoSettleRound(roundId: string): Promise<AutoSettleRoundResult> {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { legs: true },
  });

  if (!round) {
    return { status: "skipped", roundId, reason: "Round not found" };
  }

  if (round.status !== "locked") {
    return { status: "skipped", roundId, reason: `Round status is ${round.status}` };
  }

  if (round.legs.length === 0) {
    return { status: "skipped", roundId, reason: "No legs" };
  }

  const resolved = await resolveRoundOutcomes(round.legs);
  const fromMatches = resolved.ready ? resolved.outcomeMap : resolved.resolved;
  await persistResolvableLegOutcomes(round.legs, fromMatches);

  const outcomeMap = knownOutcomesForLegs(round.legs, fromMatches);
  const settleOutcomes = round.legs.map(
    (l) => outcomeMap.get(l.id) ?? (l.outcome as LegOutcome)
  );

  if (!roundIsSettleable(settleOutcomes)) {
    return {
      status: "pending",
      roundId,
      pending: resolved.ready
        ? []
        : resolved.pending,
    };
  }

  try {
    const result = await applyRoundSettlement(roundId, outcomeMap);
    return { status: "settled", roundId, profitLossGbp: result.profitLossGbp };
  } catch (err) {
    if (err instanceof RoundNotSettleableError) {
      // A concurrent settlement already claimed this round — treat as a no-op.
      return { status: "skipped", roundId, reason: "Already settled" };
    }
    throw err;
  }
}

export type AutoSettleAllResult = {
  settled: AutoSettleRoundResult[];
  pending: AutoSettleRoundResult[];
  skipped: AutoSettleRoundResult[];
};

export async function autoSettleLockedRounds(): Promise<AutoSettleAllResult> {
  const lockedRounds = await prisma.round.findMany({
    where: { status: "locked" },
    select: { id: true },
    orderBy: { lockedAt: "asc" },
  });

  const result: AutoSettleAllResult = {
    settled: [],
    pending: [],
    skipped: [],
  };

  for (const { id } of lockedRounds) {
    const outcome = await tryAutoSettleRound(id);
    if (outcome.status === "settled") result.settled.push(outcome);
    else if (outcome.status === "pending") result.pending.push(outcome);
    else result.skipped.push(outcome);
  }

  return result;
}

export type DeferredLegResolveResult = {
  roundId: string;
  legId: string;
  outcome: LegOutcome;
  points: number;
};

/**
 * Continue resolving legs on rounds that settled early after a loss.
 */
export async function resolvePendingLegsOnSettledRounds(): Promise<{
  awarded: DeferredLegResolveResult[];
}> {
  const rounds = await prisma.round.findMany({
    where: {
      status: "settled",
      legs: { some: { outcome: "pending" } },
    },
    include: { legs: true },
    orderBy: { settledAt: "asc" },
  });

  const awarded: DeferredLegResolveResult[] = [];

  for (const round of rounds) {
    const pendingLegs = round.legs.filter((l) => l.outcome === "pending");
    if (pendingLegs.length === 0) continue;

    const resolved = await resolveRoundOutcomes(pendingLegs);
    const known = resolved.ready ? resolved.outcomeMap : resolved.resolved;

    for (const [legId, outcome] of known) {
      const result = await applyDeferredLegOutcome(round.id, legId, outcome);
      if (result.awarded) {
        awarded.push({
          roundId: round.id,
          legId,
          outcome,
          points: result.points,
        });
      }
    }
  }

  return { awarded };
}
