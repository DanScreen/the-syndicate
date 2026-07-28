import { requireSession } from "@/lib/api-auth";
import { claimAndLockRound } from "@/lib/rounds/claim-lock-round";
import { isPastKickoffCutoff } from "@/lib/rounds/first-kickoff";
import { prisma } from "@tiki-acca/database";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

/**
 * Lock a solo acca on demand.
 *
 * Frozen combined odds and the best-combined-bookmaker ranking are only
 * computed at lock, so a solo member needs to lock a 4- or 6-leg acca
 * themselves rather than waiting to hit SOLO_MAX_LEGS or first kickoff.
 *
 * Restricted to `unlimitedLegs` (solo) rounds on purpose: in a multi-member
 * group a manual lock would lock everyone else out of the acca, which is why
 * locking there stays quota-driven.
 */
export async function POST(_request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const round = await prisma.round.findUnique({
    where: { id },
    include: {
      legs: { select: { kickoff: true } },
      group: { select: { members: { select: { userId: true } } } },
    },
  });

  if (!round) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }

  if (!round.group.members.some((m) => m.userId === session!.user!.id)) {
    return NextResponse.json({ error: "Not a group member" }, { status: 403 });
  }

  if (!round.unlimitedLegs) {
    return NextResponse.json(
      { error: "This acca locks when everyone has submitted their legs" },
      { status: 403 }
    );
  }

  if (round.status !== "open") {
    return NextResponse.json(
      { error: "This acca is not open" },
      { status: 400 }
    );
  }

  if (round.legs.length === 0) {
    return NextResponse.json(
      { error: "Add at least one leg before locking" },
      { status: 400 }
    );
  }

  // Past the first kickoff the round locks itself on the next touch; let that
  // path run so the outcome matches every other lock trigger.
  if (isPastKickoffCutoff(round.legs)) {
    await claimAndLockRound(round.id);
    return NextResponse.json(
      { error: "This acca already locked at the first kickoff" },
      { status: 409 }
    );
  }

  const result = await claimAndLockRound(round.id);
  if (!result.ok) {
    return NextResponse.json(
      {
        error:
          result.reason === "not_open"
            ? "This acca is not open"
            : "Add at least one leg before locking",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ locked: true });
}
