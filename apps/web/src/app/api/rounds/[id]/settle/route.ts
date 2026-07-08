import { requireSession } from "@/lib/api-auth";
import { calculateGroupProfitLoss, pointsForOutcome } from "@/lib/settlement";
import { prisma } from "@the-syndicate/database";
import { settleRoundSchema } from "@the-syndicate/shared";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id: roundId } = await params;
  const body = await request.json();
  const parsed = settleRoundSchema.safeParse({ ...body, roundId });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: {
      legs: true,
      group: { include: { members: true } },
    },
  });

  if (!round) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }

  const membership = round.group.members.find((m) => m.userId === session!.user!.id);
  if (!membership || membership.role !== "owner") {
    return NextResponse.json({ error: "Only owner can settle" }, { status: 403 });
  }

  if (round.status !== "locked") {
    return NextResponse.json({ error: "Round must be locked first" }, { status: 400 });
  }

  const outcomeMap = new Map(parsed.data.legOutcomes.map((o) => [o.legId, o.outcome]));

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

  return NextResponse.json({ profitLossGbp: profitLoss, status: "settled" });
}
