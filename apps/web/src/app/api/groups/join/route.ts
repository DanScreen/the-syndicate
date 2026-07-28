import { requireSession } from "@/lib/api-auth";
import { convertSoloRoundsToGroup } from "@/lib/rounds/convert-solo-rounds";
import { prisma } from "@tiki-acca/database";
import { joinGroupSchema } from "@tiki-acca/shared";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await request.json();
  const parsed = joinGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const group = await prisma.group.findUnique({
    where: { inviteCode: parsed.data.inviteCode.toUpperCase() },
  });

  if (!group) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  const existing = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId: group.id,
        userId: session!.user!.id,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Already a member", groupId: group.id },
      { status: 409 }
    );
  }

  // Joining and handing any solo acca over to the group must be atomic: a
  // round left flagged solo would give both members a SOLO_MAX_LEGS quota.
  await prisma.$transaction(async (tx) => {
    await tx.groupMember.create({
      data: {
        groupId: group.id,
        userId: session!.user!.id,
        role: "member",
      },
    });
    await convertSoloRoundsToGroup(group.id, tx);
  });

  return NextResponse.json({ groupId: group.id, name: group.name });
}
