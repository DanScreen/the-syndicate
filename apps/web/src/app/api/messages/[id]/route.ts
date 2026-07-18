import { requireSession } from "@/lib/api-auth";
import { serializeMessage } from "@/lib/chat/serialize";
import { prisma } from "@tiki-acca/database";
import { DELETED_MESSAGE_BODY } from "@tiki-acca/shared";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

/** Soft-delete a user message — author or group owner only. */
export async function DELETE(_request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const userId = session!.user!.id;

  const message = await prisma.roundMessage.findUnique({
    where: { id },
    select: {
      id: true,
      kind: true,
      userId: true,
      group: { select: { ownerId: true } },
    },
  });

  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  // System lifecycle messages are the thread's append-only heartbeat.
  if (message.kind !== "user") {
    return NextResponse.json({ error: "System messages cannot be deleted" }, { status: 403 });
  }
  const isAuthor = message.userId === userId;
  const isOwner = message.group.ownerId === userId;
  if (!isAuthor && !isOwner) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  // Soft delete: keep the row (and any reactions) but blank the body.
  const updated = await prisma.roundMessage.update({
    where: { id },
    data: { body: DELETED_MESSAGE_BODY },
    include: {
      user: { select: { id: true, name: true } },
      round: { select: { betNumber: true } },
      reactions: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json({ message: serializeMessage(updated, userId) });
}
