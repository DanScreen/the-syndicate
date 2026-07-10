import { requireSession } from "@/lib/api-auth";
import { tryAutoSettleRound } from "@/lib/settlement/auto-settle-round";
import { prisma } from "@the-syndicate/database";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id: roundId } = await params;

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: {
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

  const result = await tryAutoSettleRound(roundId);

  if (result.status === "pending") {
    const legs = await prisma.leg.findMany({
      where: { roundId },
      select: { id: true, outcome: true },
    });
    const resolved = Object.fromEntries(
      legs.filter((l) => l.outcome !== "pending").map((l) => [l.id, l.outcome])
    );

    return NextResponse.json(
      {
        error: "Not all legs can be settled yet",
        pending: result.pending,
        resolved,
      },
      { status: 409 }
    );
  }

  if (result.status === "skipped") {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json({
    profitLossGbp: result.profitLossGbp,
    status: "settled",
  });
}
