import { prisma } from "@tiki-acca/database";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from "@tiki-acca/shared";

export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  const row = await prisma.notificationPreference.findUnique({
    where: { userId },
  });
  if (!row) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  return {
    emailPickReminder: row.emailPickReminder,
    emailRoundLocked: row.emailRoundLocked,
    emailRoundSettled: row.emailRoundSettled,
    pushPickReminder: row.pushPickReminder,
    pushRoundLocked: row.pushRoundLocked,
    pushRoundSettled: row.pushRoundSettled,
    pushChat: row.pushChat,
  };
}

export async function upsertNotificationPreferences(
  userId: string,
  patch: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const row = await prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId, ...DEFAULT_NOTIFICATION_PREFERENCES, ...patch },
    update: patch,
  });
  return {
    emailPickReminder: row.emailPickReminder,
    emailRoundLocked: row.emailRoundLocked,
    emailRoundSettled: row.emailRoundSettled,
    pushPickReminder: row.pushPickReminder,
    pushRoundLocked: row.pushRoundLocked,
    pushRoundSettled: row.pushRoundSettled,
    pushChat: row.pushChat,
  };
}
