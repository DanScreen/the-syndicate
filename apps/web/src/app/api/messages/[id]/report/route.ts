import { getAdminEmails } from "@/lib/admin";
import { requireSession } from "@/lib/api-auth";
import { sendEmail } from "@/lib/notifications/email";
import { prisma } from "@tiki-acca/database";
import { NextResponse } from "next/server";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const reportSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

/** Report a chat message for moderation (App Review 1.2). */
export async function POST(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const userId = session!.user!.id;
  const parsed = reportSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid report" }, { status: 400 });
  }

  const message = await prisma.roundMessage.findUnique({
    where: { id },
    select: {
      groupId: true,
      kind: true,
      userId: true,
      body: true,
      user: { select: { name: true } },
    },
  });
  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }
  if (message.kind !== "user" || !message.userId) {
    return NextResponse.json(
      { error: "Only member messages can be reported" },
      { status: 400 }
    );
  }
  if (message.userId === userId) {
    return NextResponse.json(
      { error: "You can't report your own message" },
      { status: 400 }
    );
  }

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: message.groupId, userId } },
    select: { id: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  await prisma.messageReport.upsert({
    where: { messageId_reporterId: { messageId: id, reporterId: userId } },
    create: { messageId: id, reporterId: userId, reason: parsed.data.reason },
    update: { reason: parsed.data.reason },
  });

  // Alert moderation (best effort — the stored report is the source of truth).
  const admins = getAdminEmails();
  if (admins.length > 0) {
    const preview = message.body.slice(0, 200);
    await sendEmail({
      to: admins,
      subject: "Tiki Acca — chat message reported",
      html: `<p>A group chat message by <strong>${message.user?.name ?? "unknown"}</strong> was reported.</p><p>Message: ${preview}</p><p>Reason: ${parsed.data.reason ?? "(none given)"}</p><p>Message id: ${id}</p>`,
      text: `Reported message ${id} by ${message.user?.name ?? "unknown"}: ${preview}`,
    }).catch(() => false);
  }

  return NextResponse.json({ ok: true });
}
