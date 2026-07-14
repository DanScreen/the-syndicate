import {
  hasNotificationBeenSent,
  recordNotificationSent,
  sendEmailToUser,
} from "@/lib/notifications/channels/email-channel";
import { sendPushToUser } from "@/lib/notifications/channels/push-channel";
import { getNotificationPreferences } from "@/lib/notifications/preferences";
import { prisma } from "@tiki-acca/database";
import {
  emailPrefKey,
  pushPrefKey,
  type NotificationChannel,
  type NotificationType,
} from "@tiki-acca/shared";

export type DispatchNotificationInput = {
  userId: string;
  type: NotificationType;
  /** Dedup key stored in NotificationLog.type (e.g. pick_reminder_2h, round_locked). */
  dedupeType: string;
  groupId?: string;
  roundId?: string | null;
  email?: { subject: string; html: string };
  push?: {
    title: string;
    body: string;
    data?: Record<string, string>;
  };
};

export type DispatchResult = {
  email: boolean;
  push: boolean;
};

export type MemberDispatchResult = DispatchResult & { userId: string };

export async function dispatchNotification(
  input: DispatchNotificationInput
): Promise<DispatchResult> {
  const prefs = await getNotificationPreferences(input.userId);
  const roundId = input.roundId ?? null;
  const result: DispatchResult = { email: false, push: false };

  if (input.email && prefs[emailPrefKey(input.type)]) {
    const already = await hasNotificationBeenSent({
      userId: input.userId,
      type: input.dedupeType,
      roundId,
      channel: "email",
    });
    if (!already) {
      const sent = await sendEmailToUser(
        input.userId,
        input.email.subject,
        input.email.html
      );
      if (sent) {
        await recordNotificationSent({
          userId: input.userId,
          type: input.dedupeType,
          roundId,
          groupId: input.groupId,
          channel: "email",
        });
        result.email = true;
      }
    }
  }

  if (input.push && prefs[pushPrefKey(input.type)]) {
    const already = await hasNotificationBeenSent({
      userId: input.userId,
      type: input.dedupeType,
      roundId,
      channel: "push",
    });
    if (!already) {
      const sent = await sendPushToUser(input.userId, input.push);
      if (sent) {
        await recordNotificationSent({
          userId: input.userId,
          type: input.dedupeType,
          roundId,
          groupId: input.groupId,
          channel: "push",
        });
        result.push = true;
      }
    }
  }

  return result;
}

export async function dispatchToGroupMembers(params: {
  groupId: string;
  memberUserIds: string[];
  type: NotificationType;
  dedupeType: string;
  roundId?: string | null;
  buildForUser: (userId: string) => {
    email?: { subject: string; html: string };
    push?: { title: string; body: string; data?: Record<string, string> };
  };
}): Promise<MemberDispatchResult[]> {
  return Promise.all(
    params.memberUserIds.map(async (userId) => {
      const content = params.buildForUser(userId);
      const result = await dispatchNotification({
        userId,
        type: params.type,
        dedupeType: params.dedupeType,
        groupId: params.groupId,
        roundId: params.roundId,
        ...content,
      });
      return { userId, ...result };
    })
  );
}

/** True when every member got a delivery or has no applicable channel left to try. */
export async function isRoundNotificationComplete(params: {
  memberResults: MemberDispatchResult[];
  type: NotificationType;
  dedupeType: string;
  roundId: string;
}): Promise<boolean> {
  for (const member of params.memberResults) {
    if (member.email || member.push) continue;

    const prefs = await getNotificationPreferences(member.userId);
    const [user, pushCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: member.userId },
        select: { email: true },
      }),
      prisma.pushDevice.count({ where: { userId: member.userId } }),
    ]);

    const wantsEmail =
      prefs[emailPrefKey(params.type)] && Boolean(user?.email);
    const wantsPush =
      prefs[pushPrefKey(params.type)] && pushCount > 0;

    if (!wantsEmail && !wantsPush) continue;

    if (wantsEmail) {
      const sent = await hasNotificationBeenSent({
        userId: member.userId,
        type: params.dedupeType,
        roundId: params.roundId,
        channel: "email",
      });
      if (!sent) return false;
    }

    if (wantsPush) {
      const sent = await hasNotificationBeenSent({
        userId: member.userId,
        type: params.dedupeType,
        roundId: params.roundId,
        channel: "push",
      });
      if (!sent) return false;
    }
  }

  return true;
}
