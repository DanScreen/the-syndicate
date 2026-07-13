import {
  notifyRoundLocked,
  notifyRoundSettled,
} from "@/lib/notifications/round-notifications";
import { prisma } from "@the-syndicate/database";

export type RetryPendingRoundNotificationsResult = {
  lockedRetried: number;
  settledRetried: number;
};

/** Retry lock/settle notifications that failed to deliver (e.g. Resend outage). */
export async function retryPendingRoundNotifications(): Promise<RetryPendingRoundNotificationsResult> {
  const [lockedRounds, settledRounds] = await Promise.all([
    prisma.round.findMany({
      where: { status: "locked", lockedNotificationSentAt: null },
      select: { id: true },
      take: 20,
    }),
    prisma.round.findMany({
      where: { status: "settled", settledNotificationSentAt: null },
      select: { id: true },
      take: 20,
      orderBy: { settledAt: "desc" },
    }),
  ]);

  for (const round of lockedRounds) {
    await notifyRoundLocked(round.id);
  }

  for (const round of settledRounds) {
    await notifyRoundSettled(round.id);
  }

  return {
    lockedRetried: lockedRounds.length,
    settledRetried: settledRounds.length,
  };
}
