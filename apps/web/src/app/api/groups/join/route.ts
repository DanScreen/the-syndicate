import { requireSession } from "@/lib/api-auth";
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
    return NextResponse.json({ error: "Already a member" }, { status: 409 });
  }

  await prisma.groupMember.create({
    data: {
      groupId: group.id,
      userId: session!.user!.id,
      role: "member",
    },
  });

  return NextResponse.json({ groupId: group.id, name: group.name });
}
