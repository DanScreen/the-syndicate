import { requireSession } from "@/lib/api-auth";
import { applyRoundSettlement } from "@/lib/settlement/apply-round-settlement";
import { prisma } from "@the-syndicate/database";
import { settleRoundSchema } from "@the-syndicate/shared";
import type { LegOutcome } from "@the-syndicate/shared";
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

  const outcomeMap = new Map<string, LegOutcome>(
    parsed.data.legOutcomes.map((o) => [o.legId, o.outcome])
  );

  const result = await applyRoundSettlement(roundId, outcomeMap);

  return NextResponse.json(result);
}
