import { activeBetSummaries } from "@/lib/groups/active-bet-summaries";
import { activeLegsInRound, yourLegInRound } from "@/lib/groups/your-leg-summary";
import { openRound } from "@/lib/rounds/open-round";
import { groupNetPoints, memberNetPointsAcrossRounds } from "@/lib/stats/helpers";
import { prisma } from "@tiki-acca/database";
import type { GroupSummary, RoundStatus } from "@tiki-acca/shared";

/**
 * One card per group the member belongs to — the payload behind the web
 * dashboard and `GET /api/groups` (mobile home). Opens a round for any group
 * that has none, like the group page does.
 */
export async function listGroupSummaries(userId: string): Promise<GroupSummary[]> {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          owner: { select: { name: true } },
          _count: { select: { members: true } },
          rounds: {
            include: {
              legs: {
                include: { user: { select: { id: true, name: true } } },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const unreadCountByGroup = await countUnreadMessages(userId, memberships);

  return Promise.all(
    memberships.map(async (m) => {
      const allRounds = m.group.rounds;
      const activeRoundRow =
        allRounds.find((r) => r.status === "open") ??
        allRounds.find((r) => r.status === "locked") ??
        null;
      let openedSummaryRound: {
        id: string;
        betNumber: number | null;
        status: string;
        combinedOdds: number | null;
        legsPerMember: number;
        unlimitedLegs: boolean;
        legs: never[];
      } | null = null;
      let activeRound: GroupSummary["activeRound"] = activeRoundRow
        ? {
            id: activeRoundRow.id,
            betNumber: activeRoundRow.betNumber,
            status: activeRoundRow.status as RoundStatus,
            combinedOdds: activeRoundRow.combinedOdds,
            legsPerMember: activeRoundRow.legsPerMember,
          }
        : null;
      if (!activeRound) {
        const opened = await openRound(m.group.id);
        openedSummaryRound = {
          id: opened.id,
          betNumber: opened.betNumber,
          status: opened.status,
          combinedOdds: opened.combinedOdds,
          legsPerMember: opened.legsPerMember,
          unlimitedLegs: opened.unlimitedLegs,
          legs: [],
        };
        activeRound = {
          id: opened.id,
          betNumber: opened.betNumber,
          status: opened.status as RoundStatus,
          combinedOdds: opened.combinedOdds,
          legsPerMember: opened.legsPerMember,
        };
      }

      const legs = activeRoundRow?.legs ?? [];
      const activeBets = activeBetSummaries(
        openedSummaryRound ? [...allRounds, openedSummaryRound] : allRounds,
        userId,
        m.group._count.members
      );

      return {
        id: m.group.id,
        name: m.group.name,
        inviteCode: m.group.inviteCode,
        role: m.role,
        memberCount: m.group._count.members,
        status: activeRound.status,
        ownerName: m.group.owner.name,
        legsPerMember: m.group.legsPerMember,
        maxActiveBets: m.group.maxActiveBets,
        activeBetCount: activeBets.length,
        activeBets,
        groupPoints: groupNetPoints(allRounds),
        // Live member points (same as leaderboard / Performance). The stored
        // GroupMember.points is denormalized and can be stale.
        points: memberNetPointsAcrossRounds(allRounds, userId),
        activeRound,
        activeLegs: activeLegsInRound(legs, userId),
        yourLeg: yourLegInRound(legs, userId),
        yourLegCount: legs.filter((l) => l.userId === userId).length,
        unreadMessageCount: unreadCountByGroup.get(m.group.id) ?? 0,
      };
    })
  );
}

/** Unread chat per group in one query: messages since last read, excluding your own. */
async function countUnreadMessages(
  userId: string,
  memberships: {
    joinedAt: Date;
    lastReadMessageAt: Date | null;
    group: { id: string };
  }[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (memberships.length === 0) return counts;

  const unreadMessages = await prisma.roundMessage.findMany({
    where: {
      OR: memberships.map((m) => ({
        groupId: m.group.id,
        createdAt: {
          gt:
            m.lastReadMessageAt && m.lastReadMessageAt > m.joinedAt
              ? m.lastReadMessageAt
              : m.joinedAt,
        },
        OR: [{ userId: null }, { userId: { not: userId } }],
      })),
    },
    select: { groupId: true },
  });
  for (const message of unreadMessages) {
    counts.set(message.groupId, (counts.get(message.groupId) ?? 0) + 1);
  }
  return counts;
}
