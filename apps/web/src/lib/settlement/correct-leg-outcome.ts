import { postLegResultCorrectedMessage } from "@/lib/chat/system-messages";
import {
  calculateGroupProfitLoss,
  pointsForMemberLeg,
} from "@/lib/settlement";
import { prisma } from "@tiki-acca/database";
import type { LegOutcome } from "@tiki-acca/shared";

type DecidedOutcome = Exclude<LegOutcome, "pending">;

function wonLostDeltas(
  previous: string,
  next: DecidedOutcome
): { wonDelta: number; lostDelta: number } {
  let wonDelta = 0;
  let lostDelta = 0;
  if (previous === "won") wonDelta -= 1;
  if (previous === "lost") lostDelta -= 1;
  if (next === "won") wonDelta += 1;
  if (next === "lost") lostDelta += 1;
  return { wonDelta, lostDelta };
}

/**
 * Correct a leg outcome after it was written (wrong feed score, admin override).
 * Adjusts member/user points and won/lost counters by delta, updates the leg,
 * recalculates settled-round P/L, and posts a correction chat message.
 *
 * Does not reopen a settled round — early-settle + replacement open rounds stay
 * as they are; only the corrected leg's points and the round's stored P/L move.
 */
export async function correctLegOutcome(
  legId: string,
  newOutcome: DecidedOutcome
): Promise<{
  corrected: boolean;
  previousOutcome: string;
  outcome: DecidedOutcome;
  pointsDelta: number;
  roundId: string;
}> {
  return prisma.$transaction(async (tx) => {
    const leg = await tx.leg.findUnique({
      where: { id: legId },
      include: {
        round: { include: { legs: true } },
      },
    });

    if (!leg) {
      throw new Error("Leg not found");
    }

    if (leg.round.status !== "locked" && leg.round.status !== "settled") {
      throw new Error("Round must be locked or settled to correct an outcome");
    }

    if (leg.outcome === newOutcome) {
      return {
        corrected: false,
        previousOutcome: leg.outcome,
        outcome: newOutcome,
        pointsDelta: 0,
        roundId: leg.roundId,
      };
    }

    const previousOutcome = leg.outcome;
    const previewOutcomes = leg.round.legs.map((l) =>
      l.id === legId ? newOutcome : (l.outcome as LegOutcome)
    );
    const newPoints = pointsForMemberLeg(previewOutcomes, newOutcome, leg.odds);
    const previousPoints =
      previousOutcome === "pending" ? 0 : leg.pointsAwarded;
    const pointsDelta = Number((newPoints - previousPoints).toFixed(2));
    const { wonDelta, lostDelta } = wonLostDeltas(previousOutcome, newOutcome);

    await tx.leg.update({
      where: { id: legId },
      data: { outcome: newOutcome, pointsAwarded: newPoints },
    });

    if (pointsDelta !== 0 || wonDelta !== 0 || lostDelta !== 0) {
      await tx.groupMember.update({
        where: {
          groupId_userId: {
            groupId: leg.round.groupId,
            userId: leg.userId,
          },
        },
        data: {
          ...(pointsDelta !== 0 ? { points: { increment: pointsDelta } } : {}),
          ...(wonDelta !== 0 ? { legsWon: { increment: wonDelta } } : {}),
          ...(lostDelta !== 0 ? { legsLost: { increment: lostDelta } } : {}),
        },
      });

      await tx.user.update({
        where: { id: leg.userId },
        data: {
          ...(pointsDelta !== 0 ? { totalPoints: { increment: pointsDelta } } : {}),
          ...(wonDelta !== 0 ? { legsWon: { increment: wonDelta } } : {}),
          ...(lostDelta !== 0 ? { legsLost: { increment: lostDelta } } : {}),
        },
      });
    }

    if (leg.round.status === "settled") {
      const profitLoss = calculateGroupProfitLoss(
        previewOutcomes,
        leg.round.combinedOdds ?? 1,
        leg.round.stakeGbp
      );
      await tx.round.update({
        where: { id: leg.roundId },
        data: { profitLossGbp: profitLoss },
      });
    }

    await postLegResultCorrectedMessage(
      tx,
      leg,
      previousOutcome as DecidedOutcome | "pending",
      newOutcome
    );

    return {
      corrected: true,
      previousOutcome,
      outcome: newOutcome,
      pointsDelta,
      roundId: leg.roundId,
    };
  });
}
