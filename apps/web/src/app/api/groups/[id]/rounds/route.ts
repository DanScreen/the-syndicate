import { requireSession } from "@/lib/api-auth";
import { prisma } from "@the-syndicate/database";
import { startRoundSchema } from "@the-syndicate/shared";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id: groupId } = await params;
  const body = await request.json();
  const parsed = startRoundSchema.safeParse({ ...body, groupId });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: { groupId, userId: session!.user!.id },
    },
  });

  if (!membership || membership.role !== "owner") {
    return NextResponse.json({ error: "Only the owner can start a round" }, { status: 403 });
  }

  const activeRound = await prisma.round.findFirst({
    where: { groupId, status: { in: ["collecting", "locked"] } },
  });

  if (activeRound) {
    return NextResponse.json({ error: "A round is already active" }, { status: 400 });
  }

  const round = await prisma.round.create({
    data: { groupId, status: "collecting" },
  });

  await prisma.group.update({
    where: { id: groupId },
    data: { status: "collecting" },
  });

  return NextResponse.json({ round }, { status: 201 });
}
