import { requireSession } from "@/lib/api-auth";
import { prisma } from "@tiki-acca/database";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

/** Block a member — hides their chat messages everywhere (App Review 1.2). */
export async function POST(_request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id: blockedId } = await params;
  const blockerId = session!.user!.id;
  if (blockedId === blockerId) {
    return NextResponse.json({ error: "You can't block yourself" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: blockedId },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.userBlock.upsert({
    where: { blockerId_blockedId: { blockerId, blockedId } },
    create: { blockerId, blockedId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

/** Unblock a member. */
export async function DELETE(_request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id: blockedId } = await params;
  await prisma.userBlock.deleteMany({
    where: { blockerId: session!.user!.id, blockedId },
  });

  return NextResponse.json({ ok: true });
}
