import { requireSession } from "@/lib/api-auth";
import { deletePushTokenSchema, pushTokenSchema } from "@tiki-acca/shared";
import { prisma } from "@tiki-acca/database";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = pushTokenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const userId = session!.user!.id;
  const { token, platform } = parsed.data;

  const existing = await prisma.pushDevice.findUnique({ where: { token } });
  if (existing && existing.userId !== userId) {
    await prisma.pushDevice.delete({ where: { token } });
  }

  await prisma.pushDevice.upsert({
    where: { token },
    create: { userId, token, platform },
    update: { userId, platform, lastUsedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const parsed = deletePushTokenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const userId = session!.user!.id;
  if (parsed.data.token) {
    await prisma.pushDevice.deleteMany({
      where: { userId, token: parsed.data.token },
    });
  } else {
    await prisma.pushDevice.deleteMany({ where: { userId } });
  }

  return NextResponse.json({ ok: true });
}
