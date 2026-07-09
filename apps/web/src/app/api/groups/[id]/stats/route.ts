import { requireSession } from "@/lib/api-auth";
import { computeGroupStats } from "@/lib/stats/compute-group-stats";
import { prisma } from "@the-syndicate/database";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id: groupId } = await params;

  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: { groupId, userId: session!.user!.id },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const rounds = await prisma.round.findMany({
    where: { groupId, status: "settled" },
    include: { legs: true },
    orderBy: { settledAt: "asc" },
  });

  return NextResponse.json(computeGroupStats(rounds));
}
