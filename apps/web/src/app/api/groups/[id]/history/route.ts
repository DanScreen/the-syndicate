import { requireSession } from "@/lib/api-auth";
import { mapHistoryRound } from "@/lib/groups/map-history-round";
import { prisma } from "@the-syndicate/database";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;

  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: { groupId: id, userId: session!.user!.id },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const rounds = await prisma.round.findMany({
    where: { groupId: id, status: "settled" },
    orderBy: [{ settledAt: "desc" }, { createdAt: "desc" }],
    include: {
      legs: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  return NextResponse.json({
    rounds: rounds.map(mapHistoryRound),
  });
}
