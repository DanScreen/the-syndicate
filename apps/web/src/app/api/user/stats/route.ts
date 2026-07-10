import { requireSession } from "@/lib/api-auth";
import { computeUserStats } from "@/lib/stats/compute-user-stats";
import { prisma } from "@the-syndicate/database";
import { NextResponse } from "next/server";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const userId = session!.user!.id;

  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          rounds: {
            where: { status: "settled" },
            include: { legs: true },
            orderBy: { settledAt: "asc" },
          },
        },
      },
    },
  });

  const stats = computeUserStats(
    memberships.map((m) => ({
      groupId: m.groupId,
      groupName: m.group.name,
      points: m.points,
      group: { rounds: m.group.rounds },
    })),
    userId
  );

  return NextResponse.json(stats);
}
