import { requireSession } from "@/lib/api-auth";
import { computeUserStats } from "@/lib/stats/compute-user-stats";
import { statsRoundWhere } from "@/lib/stats/helpers";
import { prisma } from "@tiki-acca/database";
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
            where: statsRoundWhere,
            include: { legs: true },
            orderBy: [{ settledAt: "asc" }, { lockedAt: "asc" }, { createdAt: "asc" }],
          },
        },
      },
    },
  });

  const stats = computeUserStats(
    memberships.map((m) => ({
      groupId: m.groupId,
      groupName: m.group.name,
      group: { rounds: m.group.rounds },
    })),
    userId
  );

  return NextResponse.json(stats);
}
