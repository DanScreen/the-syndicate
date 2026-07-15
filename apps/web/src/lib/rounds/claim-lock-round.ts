import { deleteRedundantMarketLegs } from "@/lib/legs/purge-duplicate-markets";
import { lockRoundWithAccaPricing } from "@/lib/odds/lock-round";
import { notifyRoundLocked } from "@/lib/notifications/round-notifications";
import { prisma } from "@tiki-acca/database";

export type ClaimLockResult =
  | { ok: true }
  | { ok: false; reason: "not_open" | "no_legs" };

/**
 * Atomically claim open → locked, reprice the acca, and notify members.
 * Used when all members have submitted or when the first kickoff deadline passes.
 */
export async function claimAndLockRound(roundId: string): Promise<ClaimLockResult> {
  const claim = await prisma.round.updateMany({
    where: { id: roundId, status: "open" },
    data: { status: "locked" },
  });

  if (claim.count === 0) {
    return { ok: false, reason: "not_open" };
  }

  // Drop legacy duplicate market-family legs before pricing.
  await deleteRedundantMarketLegs(roundId);

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { legs: true },
  });

  if (!round || round.legs.length === 0) {
    await prisma.round.updateMany({
      where: { id: roundId, status: "locked" },
      data: { status: "open" },
    });
    return { ok: false, reason: "no_legs" };
  }

  try {
    await lockRoundWithAccaPricing(roundId, round.legs);
  } catch (err) {
    await prisma.round.updateMany({
      where: { id: roundId, status: "locked" },
      data: { status: "open" },
    });
    throw err;
  }

  await prisma.group.update({
    where: { id: round.groupId },
    data: { status: "locked" },
  });

  void notifyRoundLocked(roundId);
  return { ok: true };
}
