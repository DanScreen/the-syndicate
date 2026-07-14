import { requireSession } from "@/lib/api-auth";
import { computeMemberStats } from "@/lib/stats/compute-member-stats";
import { prisma } from "@tiki-acca/database";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string; userId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id: groupId, userId } = await params;

  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: { groupId, userId: session!.user!.id },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const targetMember = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    include: { user: { select: { id: true, name: true } } },
  });

  if (!targetMember) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const rounds = await prisma.round.findMany({
    where: { groupId, status: "settled" },
    include: { legs: true },
    orderBy: { settledAt: "asc" },
  });

  return NextResponse.json({
    name: targetMember.user.name,
    ...computeMemberStats(userId, rounds),
  });
}
