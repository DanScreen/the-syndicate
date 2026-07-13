import { notifyPickReminder } from "@/lib/notifications/round-notifications";
import { firstKickoff } from "@/lib/rounds/first-kickoff";
import { prisma } from "@the-syndicate/database";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const CRON_WINDOW_MS = 15 * 60 * 1000;

export type SendPickRemindersResult = {
  sent: number;
  skipped: number;
};

/**
 * Remind members without a leg when first kickoff is ~2 hours away.
 * Cron runs every 15 minutes — window is (now + 1h45m, now + 2h].
 */
export async function sendPickReminders(
  now: Date = new Date()
): Promise<SendPickRemindersResult> {
  const windowStart = new Date(now.getTime() + TWO_HOURS_MS - CRON_WINDOW_MS);
  const windowEnd = new Date(now.getTime() + TWO_HOURS_MS);

  const rounds = await prisma.round.findMany({
    where: { status: "open", legs: { some: {} } },
    include: {
      legs: { select: { userId: true, kickoff: true } },
      group: {
        select: {
          id: true,
          name: true,
          members: { select: { userId: true } },
        },
      },
    },
  });

  let sent = 0;
  let skipped = 0;

  for (const round of rounds) {
    const deadline = firstKickoff(round.legs);
    if (!deadline || deadline <= now) {
      skipped++;
      continue;
    }
    if (deadline > windowEnd || deadline <= windowStart) {
      skipped++;
      continue;
    }

    const submittedIds = new Set(round.legs.map((l) => l.userId));
    const pending = round.group.members.filter((m) => !submittedIds.has(m.userId));
    if (pending.length === 0) {
      skipped++;
      continue;
    }

    for (const member of pending) {
      await notifyPickReminder({
        userId: member.userId,
        groupId: round.group.id,
        groupName: round.group.name,
        roundId: round.id,
        deadline,
        pendingCount: pending.length,
      });
      sent++;
    }
  }

  return { sent, skipped };
}
