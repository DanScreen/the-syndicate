import { requireSession } from "@/lib/api-auth";
import { prisma } from "@tiki-acca/database";
import { NextResponse } from "next/server";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const user = await prisma.user.findUnique({
    where: { id: session!.user!.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      name: true,
      email: true,
      totalPoints: true,
      legsWon: true,
      legsLost: true,
      memberships: {
        include: {
          group: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json({ user });
}
