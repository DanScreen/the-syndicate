import { applyRoundSettlement } from "@/lib/settlement/apply-round-settlement";
import {
  persistResolvableLegOutcomes,
  resolveRoundOutcomes,
} from "@/lib/settlement/resolve-round-outcomes";
import { prisma } from "@the-syndicate/database";

export type AutoSettleRoundResult =
  | { status: "settled"; roundId: string; profitLossGbp: number }
  | { status: "pending"; roundId: string; pending: { legId: string; reason: string }[] }
  | { status: "skipped"; roundId: string; reason: string };

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
  const knownOutcomes = resolved.ready ? resolved.outcomeMap : resolved.resolved;
  await persistResolvableLegOutcomes(round.legs, knownOutcomes);

  if (!resolved.ready) {
    return { status: "pending", roundId, pending: resolved.pending };
  }

  const result = await applyRoundSettlement(roundId, resolved.outcomeMap);

  return { status: "settled", roundId, profitLossGbp: result.profitLossGbp };
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
