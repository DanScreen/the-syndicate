import { calculateGroupProfitLoss, pointsForOutcome } from "@/lib/settlement";
import { notifyRoundSettled } from "@/lib/notifications/round-notifications";
import { openCollectingRound } from "@/lib/rounds/open-collecting-round";
import { prisma } from "@the-syndicate/database";
import type { LegOutcome } from "@the-syndicate/shared";

export async function applyRoundSettlement(
  roundId: string,
  outcomeMap: Map<string, LegOutcome>
): Promise<{ profitLossGbp: number; status: "settled" }> {
  const result = await prisma.$transaction(async (tx) => {
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

    if (round.status !== "locked") {
      throw new Error("Round must be locked first");
    }

    for (const leg of round.legs) {
      const outcome = outcomeMap.get(leg.id) ?? "lost";
      const points = pointsForOutcome(outcome, leg.odds);

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

    const outcomes = round.legs.map((l) => outcomeMap.get(l.id) ?? "lost");
    const profitLoss = calculateGroupProfitLoss(
      outcomes,
      round.combinedOdds ?? 1,
      round.stakeGbp
    );

    await tx.round.update({
      where: { id: roundId },
      data: {
        status: "settled",
        profitLossGbp: profitLoss,
        settledAt: new Date(),
      },
    });

    await openCollectingRound(round.groupId, tx);

    return { profitLossGbp: profitLoss, status: "settled" as const };
  });

  void notifyRoundSettled(roundId);

  return result;
}
