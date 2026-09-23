import { claimAndLockRound } from "@/lib/rounds/claim-lock-round";
import { isPastKickoffCutoff } from "@/lib/rounds/first-kickoff";
import { prisma } from "@tiki-acca/database";

export type LockSoloRoundResult =
  | { ok: true }
  | { ok: false; status: 400 | 403 | 404 | 409; error: string };

/**
 * Lock a solo acca on demand — the guard logic behind
 * `POST /api/rounds/[id]/lock`.
 *
 * Frozen combined odds and the best-combined-bookmaker ranking are only
 * computed at lock, so a solo member needs to lock a 4- or 6-leg acca
 * themselves rather than waiting to hit SOLO_MAX_LEGS or first kickoff.
 *
 * Restricted to `unlimitedLegs` (solo) rounds on purpose: in a multi-member
 * group a manual lock would lock everyone else out of the acca, which is why
 * locking there stays quota-driven.
 */
export async function lockSoloRound(
  roundId: string,
  userId: string
): Promise<LockSoloRoundResult> {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: {
      legs: { select: { kickoff: true } },
      group: { select: { members: { select: { userId: true } } } },
    },
  });

  if (!round) {
    return { ok: false, status: 404, error: "Round not found" };
  }

  if (!round.group.members.some((m) => m.userId === userId)) {
    return { ok: false, status: 403, error: "Not a group member" };
  }

  if (!round.unlimitedLegs) {
    return {
      ok: false,
      status: 403,
      error: "This acca locks when everyone has submitted their legs",
    };
  }

  if (round.status !== "open") {
    return { ok: false, status: 400, error: "This acca is not open" };
  }

  if (round.legs.length === 0) {
    return { ok: false, status: 400, error: "Add at least one leg before locking" };
  }

  // Past the first kickoff the round locks itself on the next touch; let that
  // path run so the outcome matches every other lock trigger.
  if (isPastKickoffCutoff(round.legs)) {
    await claimAndLockRound(round.id);
    return {
      ok: false,
      status: 409,
      error: "This acca already locked at the first kickoff",
    };
  }

  const result = await claimAndLockRound(round.id);
  if (!result.ok) {
    return {
      ok: false,
      status: 400,
      error:
        result.reason === "not_open"
          ? "This acca is not open"
          : "Add at least one leg before locking",
    };
  }

  return { ok: true };
}
