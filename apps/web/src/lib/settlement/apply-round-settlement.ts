import { calculateGroupProfitLoss, pointsForOutcome } from "@/lib/settlement";
import { prisma } from "@the-syndicate/database";
import type { LegOutcome } from "@the-syndicate/shared";

export async function applyRoundSettlement(
  roundId: string,
  outcomeMap: Map<string, LegOutcome>
): Promise<{ profitLossGbp: number; status: "settled" }> {
  const round = await prisma.round.findUnique({
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
    const points = pointsForOutcome(outcome);

    await prisma.leg.update({
      where: { id: leg.id },
      data: { outcome, pointsAwarded: points },
    });

    await prisma.groupMember.update({
      where: {
        groupId_userId: { groupId: round.groupId, userId: leg.userId },
      },
      data: {
        points: { increment: points },
        legsWon: outcome === "won" ? { increment: 1 } : undefined,
        legsLost: outcome === "lost" ? { increment: 1 } : undefined,
      },
    });

    await prisma.user.update({
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

  await prisma.round.update({
    where: { id: roundId },
    data: {
      status: "settled",
      profitLossGbp: profitLoss,
      settledAt: new Date(),
    },
  });

  await prisma.group.update({
    where: { id: round.groupId },
    data: { status: "settled" },
  });

  return { profitLossGbp: profitLoss, status: "settled" };
}
