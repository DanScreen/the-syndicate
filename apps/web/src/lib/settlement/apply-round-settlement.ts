import {
  postLegResultMessage,
  postRoundSettledMessage,
} from "@/lib/chat/system-messages";
import { calculateGroupProfitLoss, pointsForMemberLeg } from "@/lib/settlement";
import { notifyRoundSettled } from "@/lib/notifications/round-notifications";
import { openRound } from "@/lib/rounds/open-round";
import { prisma } from "@tiki-acca/database";
import { roundIsSettleable, type LegOutcome } from "@tiki-acca/shared";

/**
 * Thrown when a round can no longer be settled — typically because a
 * concurrent settlement (manual, owner auto-settle, or cron) already
 * claimed it. Callers should treat this as a benign no-op, not a failure.
 */
export class RoundNotSettleableError extends Error {
  constructor(message = "Round is not in a settleable state") {
    super(message);
    this.name = "RoundNotSettleableError";
  }
}

function mergeLegOutcome(
  leg: { id: string; outcome: string },
  outcomeMap: Map<string, LegOutcome>
): LegOutcome {
  return outcomeMap.get(leg.id) ?? (leg.outcome as LegOutcome);
}

export async function applyRoundSettlement(
  roundId: string,
  outcomeMap: Map<string, LegOutcome>
): Promise<{ profitLossGbp: number; status: "settled" }> {
  // Validate before claiming so a bad settle attempt can't leave the round stuck.
  const existing = await prisma.round.findUnique({
    where: { id: roundId },
    include: { legs: true },
  });

  if (!existing || existing.status !== "locked") {
    throw new RoundNotSettleableError();
  }

  const previewOutcomes = existing.legs.map((l) => mergeLegOutcome(l, outcomeMap));
  if (!roundIsSettleable(previewOutcomes)) {
    throw new Error(
      "Round is not settleable — need all legs resolved, or at least one lost leg"
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    // Atomically claim the round: flip locked -> settled in a single
    // conditional write. Under Read Committed this row-locks the round, so a
    // concurrent settlement blocks here and then matches zero rows (status is
    // no longer "locked") — guaranteeing points are awarded exactly once.
    const claim = await tx.round.updateMany({
      where: { id: roundId, status: "locked" },
      data: { status: "settled", settledAt: new Date() },
    });

    if (claim.count === 0) {
      throw new RoundNotSettleableError();
    }

    const round = await tx.round.findUnique({
      where: { id: roundId },
      include: {
        legs: true,
        group: { include: { members: true } },
      },
    });

    if (!round) {
      throw new Error("Round not found");
    }

    const outcomes = round.legs.map((l) => mergeLegOutcome(l, outcomeMap));

    for (const leg of round.legs) {
      const outcome = mergeLegOutcome(leg, outcomeMap);
      const points = pointsForMemberLeg(outcomes, outcome, leg.odds);

      // Claim pending → outcome so the leg_result chat message posts exactly
      // once even when a concurrent cron persisted this leg's outcome (and
      // posted its message) after our transaction read the round.
      const freshlyResolved = await tx.leg.updateMany({
        where: { id: leg.id, outcome: "pending" },
        data: { outcome, pointsAwarded: points },
      });

      if (freshlyResolved.count === 0) {
        await tx.leg.update({
          where: { id: leg.id },
          data: { outcome, pointsAwarded: points },
        });
      } else if (outcome !== "pending") {
        await postLegResultMessage(tx, leg, outcome);
      }

      // Pending legs on a busted acca keep monitoring; points land when they resolve.
      if (outcome === "pending") continue;

      await tx.groupMember.update({
        where: {
          groupId_userId: { groupId: round.groupId, userId: leg.userId },
        },
        data: {
          points: { increment: points },
          legsWon: outcome === "won" ? { increment: 1 } : undefined,
          legsLost: outcome === "lost" ? { increment: 1 } : undefined,
        },
      });

      await tx.user.update({
        where: { id: leg.userId },
        data: {
          totalPoints: { increment: points },
          legsWon: outcome === "won" ? { increment: 1 } : undefined,
          legsLost: outcome === "lost" ? { increment: 1 } : undefined,
        },
      });
    }

    const profitLoss = calculateGroupProfitLoss(
      outcomes,
      round.combinedOdds ?? 1,
      round.stakeGbp
    );

    await tx.round.update({
      where: { id: roundId },
      data: { profitLossGbp: profitLoss },
    });

    // Inside the settle transaction, gated on the locked → settled claim
    // above — a retried or overlapping settle can never double-post.
    await postRoundSettledMessage(tx, roundId, outcomes, round.combinedOdds);

    await openRound(round.groupId, tx);

    return { profitLossGbp: profitLoss, status: "settled" as const };
  });

  void notifyRoundSettled(roundId);

  return result;
}

/**
 * Award points for a leg that finished after the acca was already settled
 * (early lose). Exactly-once via pending → outcome claim.
 */
export async function applyDeferredLegOutcome(
  roundId: string,
  legId: string,
  outcome: LegOutcome
): Promise<{ awarded: boolean; points: number }> {
  if (outcome === "pending") {
    return { awarded: false, points: 0 };
  }

  return prisma.$transaction(async (tx) => {
    const round = await tx.round.findUnique({
      where: { id: roundId },
      include: { legs: true },
    });

    if (!round || round.status !== "settled") {
      return { awarded: false, points: 0 };
    }

    const leg = round.legs.find((l) => l.id === legId);
    if (!leg || leg.outcome !== "pending") {
      return { awarded: false, points: 0 };
    }

    const outcomes = round.legs.map((l) =>
      l.id === legId ? outcome : (l.outcome as LegOutcome)
    );
    const points = pointsForMemberLeg(outcomes, outcome, leg.odds);

    const claim = await tx.leg.updateMany({
      where: { id: legId, outcome: "pending" },
      data: { outcome, pointsAwarded: points },
    });

    if (claim.count === 0) {
      return { awarded: false, points: 0 };
    }

    // Same pending → outcome claim as above guarantees exactly one message.
    await postLegResultMessage(tx, leg, outcome);

    await tx.groupMember.update({
      where: {
        groupId_userId: { groupId: round.groupId, userId: leg.userId },
      },
      data: {
        points: { increment: points },
        legsWon: outcome === "won" ? { increment: 1 } : undefined,
        legsLost: outcome === "lost" ? { increment: 1 } : undefined,
      },
    });

    await tx.user.update({
      where: { id: leg.userId },
      data: {
        totalPoints: { increment: points },
        legsWon: outcome === "won" ? { increment: 1 } : undefined,
        legsLost: outcome === "lost" ? { increment: 1 } : undefined,
      },
    });

    return { awarded: true, points };
  });
}
