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

  const [rounds, groupMembers] = await Promise.all([
    prisma.round.findMany({
      where: { groupId, status: "settled" },
      include: { legs: true },
      orderBy: { settledAt: "asc" },
    }),
    prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  const members = groupMembers.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
  }));

  return NextResponse.json(computeGroupStats(rounds, members));
}
