import { requireSession } from "@/lib/api-auth";
import { serializeMessage } from "@/lib/chat/serialize";
import { prisma } from "@tiki-acca/database";
import { toggleReactionSchema } from "@tiki-acca/shared";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const userId = session!.user!.id;
  const parsed = toggleReactionSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const message = await prisma.roundMessage.findUnique({
    where: { id },
    select: { round: { select: { groupId: true } } },
  });
  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: { groupId: message.round.groupId, userId },
    },
    select: { id: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const emoji = parsed.data.emoji;
  await prisma.$transaction(async (tx) => {
    const existing = await tx.messageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId: id, userId, emoji } },
      select: { id: true },
    });
    if (existing) {
      await tx.messageReaction.delete({ where: { id: existing.id } });
    } else {
      await tx.messageReaction.create({
        data: { messageId: id, userId, emoji },
      });
    }
  });

  const updated = await prisma.roundMessage.findUniqueOrThrow({
    where: { id },
    include: {
      user: { select: { id: true, name: true } },
      reactions: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  return NextResponse.json({ message: serializeMessage(updated, userId) });
}
