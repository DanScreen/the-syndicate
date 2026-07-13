import { prisma } from "@the-syndicate/database";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from "@the-syndicate/shared";

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
  };
}
