import {
  postLegResultMessage,
  postRoundReopenedMessage,
  tryPostSystemMessage,
} from "@/lib/chat/system-messages";
import { notifyPickVoided } from "@/lib/notifications/round-notifications";
import { formatNotificationDeadline, type PickVoidedSwap } from "@/lib/notifications/templates";
import { findDbMatchForLeg } from "@/lib/results/match-store";
import { isResultHeldForReview, isVoidMatchStatus } from "@/lib/results/result-confirmation";
import { firstKickoff } from "@/lib/rounds/first-kickoff";
import { prisma } from "@tiki-acca/database";
import { effectiveAccaOdds, isOutrightFixtureId } from "@tiki-acca/shared";
import type { Leg } from "@prisma/client";

export type VoidPostponedLegsResult = {
  /** Legs flipped pending → void this run. */
  voided: string[];
  /** Locked rounds reopened so a void pick can be swapped. */
  reopened: string[];
  notified: number;
};

/**
 * Cron step (before the kickoff lock): void picks whose match was postponed,
 * cancelled, suspended or awarded, and give the owner a chance to swap them.
 *
 * - Locked round with a remaining kickoff still ahead → reopen it
 *   (`locked → open`, `reopenedAt` set). Only the void pick can be swapped;
 *   the round re-locks once no void picks remain, or at the first remaining
 *   kickoff with the void pick left out.
 * - Open round → the pick can be swapped until the first remaining kickoff,
 *   like any other edit.
 * - Otherwise the acca carries on without the pick (void counts at 1.00).
 *
 * Idempotent: the leg claim is `pending → void`, the reopen claim is
 * `locked → open`, and each pick's notification is deduped per leg.
 */
export async function voidPostponedLegs(
  options: { now?: Date; roundIds?: string[] } = {}
): Promise<VoidPostponedLegsResult> {
  const now = options.now ?? new Date();
  const result: VoidPostponedLegsResult = { voided: [], reopened: [], notified: 0 };

  const rounds = await prisma.round.findMany({
    where: {
      ...(options.roundIds ? { id: { in: options.roundIds } } : {}),
      status: { in: ["open", "locked"] },
      legs: { some: { outcome: { in: ["pending", "void"] } } },
    },
    include: {
      legs: true,
      group: { select: { id: true, name: true } },
    },
  });

  for (const round of rounds) {
    const legs: Leg[] = [];
    for (const leg of round.legs) {
      if (leg.outcome !== "pending" || isOutrightFixtureId(leg.fixtureId)) {
        legs.push(leg);
        continue;
      }
      const match = await findDbMatchForLeg(leg);
      if (!match || !isVoidMatchStatus(match.status) || isResultHeldForReview(match)) {
        legs.push(leg);
        continue;
      }
      const claimed = await prisma.$transaction(async (tx) => {
        const claim = await tx.leg.updateMany({
          where: { id: leg.id, outcome: "pending" },
          data: { outcome: "void", matchId: match.id },
        });
        if (claim.count === 0) return false;
        await postLegResultMessage(tx, leg, "void");
        return true;
      });
      if (claimed) result.voided.push(leg.id);
      legs.push({ ...leg, outcome: "void" });
    }

    const voidLegs = legs.filter((l) => l.outcome === "void");
    if (voidLegs.length === 0) continue;

    const deadline = firstKickoff(legs);
    const windowOpen = deadline !== null && deadline > now;
    let swap: PickVoidedSwap;

    if (round.status === "locked") {
      if (windowOpen) {
        const reopened = await reopenRound(round.id, round.group.id, now);
        if (!reopened) continue;
        result.reopened.push(round.id);
        for (const leg of voidLegs) {
          await tryPostSystemMessage("round_reopened", () =>
            postRoundReopenedMessage(prisma, leg, formatNotificationDeadline(deadline))
          );
        }
        swap = "reopened";
      } else {
        swap = "closed";
      }
    } else {
      swap = deadline === null || windowOpen ? "open" : "closed";
    }

    const hasLiveLegs = legs.some((l) => l.outcome !== "void");
    const oddsWithout = hasLiveLegs ? effectiveAccaOdds(round.combinedOdds, legs) : null;

    for (const leg of voidLegs) {
      try {
        const sent = await notifyPickVoided({
          leg,
          groupId: round.group.id,
          groupName: round.group.name,
          swap,
          deadline: windowOpen ? deadline : null,
          oddsWithout,
        });
        if (sent.email || sent.push) result.notified += 1;
      } catch (err) {
        console.error("[notifications] pick voided delivery failed", leg.id, err);
      }
    }
  }

  return result;
}

async function reopenRound(roundId: string, groupId: string, now: Date): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const claim = await tx.round.updateMany({
      where: { id: roundId, status: "locked" },
      // Clearing the sent marker lets the relock announce the new acca.
      data: { status: "open", reopenedAt: now, lockedNotificationSentAt: null },
    });
    if (claim.count === 0) return false;
    await tx.group.update({ where: { id: groupId }, data: { status: "open" } });
    return true;
  });
}
