import { appBaseUrl } from "@/lib/notifications/email-layout";
import {
  dispatchNotification,
  dispatchToGroupMembers,
  isRoundNotificationComplete,
  type DispatchResult,
} from "@/lib/notifications/dispatch";
import {
  pickReminderEmail,
  pickReminderPush,
  pickVoidedEmail,
  pickVoidedPush,
  type PickVoidedSwap,
  roundLockedEmail,
  roundLockedPush,
  roundSettledEmail,
  roundSettledPush,
} from "@/lib/notifications/templates";
import { prisma } from "@tiki-acca/database";
import {
  formatFixtureLabel,
  formatLegPoints,
  membersMissingQuota,
} from "@tiki-acca/shared";

const DEDUPE_ROUND_LOCKED = "round_locked";

/** A reopened round notifies members again when it re-locks. */
function roundLockedDedupe(reopenedAt: Date | null): string {
  return reopenedAt
    ? `${DEDUPE_ROUND_LOCKED}:${reopenedAt.getTime()}`
    : DEDUPE_ROUND_LOCKED;
}
const DEDUPE_ROUND_SETTLED = "round_settled";
export const DEDUPE_PICK_REMINDER_2H = "pick_reminder_2h";

function groupDeepLink(groupId: string): string {
  return `${appBaseUrl()}/groups/${groupId}`;
}

function pushData(groupId: string, roundId?: string) {
  return {
    groupId,
    ...(roundId ? { roundId } : {}),
    url: `tikiacca://groups/${groupId}`,
  };
}

export async function notifyPickReminder(params: {
  userId: string;
  groupId: string;
  groupName: string;
  roundId: string;
  deadline: Date;
  pendingCount: number;
}): Promise<DispatchResult> {
  const groupUrl = groupDeepLink(params.groupId);
  const email = pickReminderEmail({
    groupName: params.groupName,
    deadline: params.deadline,
    pendingCount: params.pendingCount,
    groupUrl,
  });
  const push = pickReminderPush({
    groupName: params.groupName,
    deadline: params.deadline,
  });

  return dispatchNotification({
    userId: params.userId,
    type: "pick_reminder",
    dedupeType: DEDUPE_PICK_REMINDER_2H,
    groupId: params.groupId,
    roundId: params.roundId,
    email,
    push: { ...push, data: pushData(params.groupId, params.roundId) },
  });
}

/**
 * Tell a member their pick went void (postponed, cancelled…): swap it before
 * `deadline`, or the acca continues without it. Once per leg.
 */
export async function notifyPickVoided(params: {
  leg: {
    id: string;
    userId: string;
    roundId: string;
    fixtureId: string;
    homeTeam: string;
    awayTeam: string;
    selectionLabel: string;
  };
  groupId: string;
  groupName: string;
  swap: PickVoidedSwap;
  deadline: Date | null;
  oddsWithout: number | null;
}): Promise<DispatchResult> {
  const fixture = formatFixtureLabel(params.leg, "v");
  const groupUrl = groupDeepLink(params.groupId);
  return dispatchNotification({
    userId: params.leg.userId,
    type: "pick_voided",
    dedupeType: `pick_voided:${params.leg.id}`,
    groupId: params.groupId,
    roundId: params.leg.roundId,
    email: pickVoidedEmail({
      groupName: params.groupName,
      fixture,
      selectionLabel: params.leg.selectionLabel,
      swap: params.swap,
      deadline: params.deadline,
      oddsWithout: params.oddsWithout,
      groupUrl,
    }),
    push: {
      ...pickVoidedPush({
        groupName: params.groupName,
        fixture,
        swap: params.swap,
        deadline: params.deadline,
        oddsWithout: params.oddsWithout,
      }),
      data: pushData(params.groupId, params.leg.roundId),
    },
  });
}

export async function notifyRoundLocked(roundId: string): Promise<void> {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: {
      legs: { include: { user: { select: { name: true } } } },
      group: {
        select: {
          id: true,
          name: true,
          members: { select: { userId: true } },
        },
      },
    },
  });

  if (!round || round.status !== "locked") return;
  if (round.lockedNotificationSentAt) return;

  const dedupeType = roundLockedDedupe(round.reopenedAt);
  // Void picks (postponed…) aren't part of the acca.
  const liveLegs = round.legs.filter((l) => l.outcome !== "void");
  const groupUrl = groupDeepLink(round.group.id);
  const odds = round.combinedOdds?.toFixed(2) ?? "—";
  const missingCount = membersMissingQuota({
    memberUserIds: round.group.members.map((m) => m.userId),
    legs: liveLegs,
    legsPerMember: round.legsPerMember,
  }).length;

  const emailContent = roundLockedEmail({
    groupName: round.group.name,
    combinedOdds: odds,
    legs: [...liveLegs]
      .sort((a, b) => {
        const byName = a.user.name.localeCompare(b.user.name);
        if (byName !== 0) return byName;
        return a.legIndex - b.legIndex;
      })
      .map((leg) => ({
        memberName:
          round.legsPerMember > 1
            ? `${leg.user.name} (leg ${leg.legIndex})`
            : leg.user.name,
        selectionLabel: leg.selectionLabel,
        marketLabel: leg.marketLabel,
        odds: leg.odds,
      })),
    missingCount,
    groupUrl,
  });
  const pushContent = roundLockedPush(round.group.name);

  const memberResults = await dispatchToGroupMembers({
    groupId: round.group.id,
    memberUserIds: round.group.members.map((m) => m.userId),
    type: "round_locked",
    dedupeType,
    roundId: round.id,
    buildForUser: () => ({
      email: emailContent,
      push: { ...pushContent, data: pushData(round.group.id, round.id) },
    }),
  });

  const complete = await isRoundNotificationComplete({
    memberResults,
    type: "round_locked",
    dedupeType,
    roundId: round.id,
  });

  if (complete) {
    await prisma.round.update({
      where: { id: roundId },
      data: { lockedNotificationSentAt: new Date() },
    });
  }
}

export async function notifyRoundSettled(roundId: string): Promise<void> {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: {
      legs: { include: { user: { select: { name: true } } } },
      group: {
        select: {
          id: true,
          name: true,
          members: { select: { userId: true } },
        },
      },
    },
  });

  if (!round || round.status !== "settled") return;
  if (round.settledNotificationSentAt) return;

  const groupUrl = groupDeepLink(round.group.id);
  const wonCount = round.legs.filter((l) => l.outcome === "won").length;
  const lostCount = round.legs.filter((l) => l.outcome === "lost").length;
  const pl = round.profitLossGbp ?? 0;
  const plLabel = pl >= 0 ? `+£${pl.toFixed(2)}` : `−£${Math.abs(pl).toFixed(2)}`;

  const emailContent = roundSettledEmail({
    groupName: round.group.name,
    plLabel,
    wonCount,
    lostCount,
    legs: round.legs.map((leg) => ({
      memberName: leg.user.name,
      selectionLabel: leg.selectionLabel,
      marketLabel: leg.marketLabel,
      outcome:
        leg.outcome === "won" ||
        leg.outcome === "lost" ||
        leg.outcome === "void"
          ? leg.outcome
          : "pending",
      pointsLabel: formatLegPoints(leg.pointsAwarded),
    })),
    groupUrl,
  });
  const pushContent = roundSettledPush({
    groupName: round.group.name,
    wonCount,
    lostCount,
  });

  const memberResults = await dispatchToGroupMembers({
    groupId: round.group.id,
    memberUserIds: round.group.members.map((m) => m.userId),
    type: "round_settled",
    dedupeType: DEDUPE_ROUND_SETTLED,
    roundId: round.id,
    buildForUser: () => ({
      email: emailContent,
      push: { ...pushContent, data: pushData(round.group.id, round.id) },
    }),
  });

  const complete = await isRoundNotificationComplete({
    memberResults,
    type: "round_settled",
    dedupeType: DEDUPE_ROUND_SETTLED,
    roundId: round.id,
  });

  if (complete) {
    await prisma.round.update({
      where: { id: roundId },
      data: { settledNotificationSentAt: new Date() },
    });
  }
}
