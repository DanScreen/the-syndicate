import { dispatchNotification } from "@/lib/notifications/dispatch";
import { prisma } from "@tiki-acca/database";

const CHAT_PUSH_WINDOW_MS = 10 * 60 * 1000;
const FOREGROUND_GRACE_MS = 30 * 1000;

/**
 * Push-only, rate-batched chat notification. A recipient who has loaded the
 * group thread in the last 30 seconds is treated as foregrounded and skipped.
 */
export async function notifyChatMessage(params: {
  groupId: string;
  senderId: string;
}): Promise<void> {
  const group = await prisma.group.findUnique({
    where: { id: params.groupId },
    select: {
      id: true,
      name: true,
      members: {
        where: { userId: { not: params.senderId } },
        select: { userId: true, lastReadMessageAt: true },
      },
    },
  });
  if (!group) return;

  const now = Date.now();
  const bucketStartMs = Math.floor(now / CHAT_PUSH_WINDOW_MS) * CHAT_PUSH_WINDOW_MS;
  const bucketStart = new Date(bucketStartMs);
  const messageCount = await prisma.roundMessage.count({
    where: {
      groupId: group.id,
      kind: "user",
      createdAt: { gte: bucketStart },
    },
  });
  const body =
    messageCount === 1
      ? `New message in ${group.name}`
      : `${messageCount} new messages in ${group.name}`;

  await Promise.all(
    group.members.map(async (member) => {
      if (
        member.lastReadMessageAt &&
        now - member.lastReadMessageAt.getTime() < FOREGROUND_GRACE_MS
      ) {
        return;
      }
      await dispatchNotification({
        userId: member.userId,
        type: "chat_message",
        dedupeType: `chat_message_${bucketStartMs}`,
        groupId: group.id,
        // NotificationLog's roundId column is the durable dedupe scope. Chat
        // batching is group-scoped, so use the group id rather than the round.
        roundId: group.id,
        push: {
          title: "Tiki Acca Group Chat",
          body,
          data: {
            groupId: group.id,
            screen: "chat",
            url: `tikiacca://groups/${group.id}/chat`,
          },
        },
      });
    })
  );
}
