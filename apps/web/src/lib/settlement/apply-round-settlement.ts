import { calculateGroupProfitLoss, pointsForMemberLeg } from "@/lib/settlement";
import { notifyRoundSettled } from "@/lib/notifications/round-notifications";
import { openCollectingRound } from "@/lib/rounds/open-collecting-round";
import { prisma } from "@the-syndicate/database";
import type { LegOutcome } from "@the-syndicate/shared";

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

export async function applyRoundSettlement(
  roundId: string,
  outcomeMap: Map<string, LegOutcome>
): Promise<{ profitLossGbp: number; status: "settled" }> {
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

    const outcomes = round.legs.map((l) => outcomeMap.get(l.id) ?? "lost");

    for (const leg of round.legs) {
      const outcome = outcomeMap.get(leg.id) ?? "lost";
      const points = pointsForMemberLeg(outcomes, outcome, leg.odds);

      await tx.leg.update({
        where: { id: leg.id },
        data: { outcome, pointsAwarded: points },
      });

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

    await openCollectingRound(round.groupId, tx);

    return { profitLossGbp: profitLoss, status: "settled" as const };
  });

  void notifyRoundSettled(roundId);

  return result;
}
