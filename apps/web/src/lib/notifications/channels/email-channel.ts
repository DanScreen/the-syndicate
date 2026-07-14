import { sendEmail } from "@/lib/notifications/email";
import type { NotificationChannel } from "@tiki-acca/shared";
import { Prisma, prisma } from "@tiki-acca/database";

export async function sendEmailToUser(
  userId: string,
  subject: string,
  html: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user?.email) return false;
  return sendEmail({ to: [user.email], subject, html });
}

export async function hasNotificationBeenSent(params: {
  userId: string;
  type: string;
  roundId: string | null;
  channel: NotificationChannel;
}): Promise<boolean> {
  const existing = await prisma.notificationLog.findFirst({
    where: {
      userId: params.userId,
      type: params.type,
      roundId: params.roundId,
      channel: params.channel,
    },
  });
  return Boolean(existing);
}

export async function recordNotificationSent(params: {
  userId: string;
  type: string;
  roundId: string | null;
  groupId?: string;
  channel: NotificationChannel;
}): Promise<void> {
  try {
    await prisma.notificationLog.create({
      data: {
        userId: params.userId,
        type: params.type,
        roundId: params.roundId,
        groupId: params.groupId,
        channel: params.channel,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return;
    }
    throw err;
  }
}
