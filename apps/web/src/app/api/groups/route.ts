import { requireSession } from "@/lib/api-auth";
import { generateInviteCode } from "@/lib/invite-code";
import { activeLegsInRound, yourLegInRound } from "@/lib/groups/your-leg-summary";
import { activeBetSummaries } from "@/lib/groups/active-bet-summaries";
import { openRound } from "@/lib/rounds/open-round";
import { groupNetPoints, memberNetPointsAcrossRounds } from "@/lib/stats/helpers";
import { prisma } from "@tiki-acca/database";
import { createGroupSchema } from "@tiki-acca/shared";
import { NextResponse } from "next/server";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const userId = session!.user!.id;

  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          owner: { select: { name: true } },
          _count: { select: { members: true, rounds: true } },
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

  const groups = await Promise.all(
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
        legs: never[];
      } | null = null;
      let activeRound: {
        id: string;
        betNumber: number | null;
        status: string;
        combinedOdds: number | null;
        legsPerMember: number;
      } | null = activeRoundRow
        ? {
            id: activeRoundRow.id,
            betNumber: activeRoundRow.betNumber,
            status: activeRoundRow.status,
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
          legs: [],
        };
        activeRound = {
          id: opened.id,
          betNumber: opened.betNumber,
          status: opened.status,
          combinedOdds: opened.combinedOdds,
          legsPerMember: opened.legsPerMember,
        };
      }

      const legs = activeRoundRow?.legs ?? [];
      const yourLegCount = legs.filter((l) => l.userId === userId).length;
      const activeBets = activeBetSummaries(
        openedSummaryRound ? [...allRounds, openedSummaryRound] : allRounds,
        userId,
        m.group._count.members
      );
      const unreadSince =
        m.lastReadMessageAt && m.lastReadMessageAt > m.joinedAt
          ? m.lastReadMessageAt
          : m.joinedAt;
      const unreadMessageCount = await prisma.roundMessage.count({
        where: {
          groupId: m.group.id,
          createdAt: { gt: unreadSince },
          OR: [{ userId: null }, { userId: { not: userId } }],
        },
      });

      return {
        id: m.group.id,
        name: m.group.name,
        inviteCode: m.group.inviteCode,
        role: m.role,
        memberCount: m.group._count.members,
        status: activeRound?.status ?? "open",
        ownerName: m.group.owner.name,
        legsPerMember: m.group.legsPerMember,
        maxActiveBets: m.group.maxActiveBets,
        activeBetCount: activeBets.length,
        activeBets,
        groupPoints: groupNetPoints(allRounds),
        // Live member points (same as leaderboard / Performance) — not stored GroupMember.points.
        points: memberNetPointsAcrossRounds(allRounds, userId),
        activeRound,
        activeLegs: activeLegsInRound(legs, userId),
        yourLeg: yourLegInRound(legs, userId),
        yourLegCount,
        unreadMessageCount,
      };
    })
  );

  return NextResponse.json({ groups });
}

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await request.json();
  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let inviteCode = generateInviteCode();
  let attempts = 0;
  while (attempts < 5) {
    const clash = await prisma.group.findUnique({ where: { inviteCode } });
    if (!clash) break;
    inviteCode = generateInviteCode();
    attempts++;
  }

  const legsPerMember = parsed.data.legsPerMember;
  const maxActiveBets = parsed.data.maxActiveBets;

  const group = await prisma.group.create({
    data: {
      name: parsed.data.name,
      inviteCode,
      status: "open",
      legsPerMember,
      maxActiveBets,
      ownerId: session!.user!.id,
      members: {
        create: {
          userId: session!.user!.id,
          role: "owner",
        },
      },
      rounds: {
        create: { status: "open", legsPerMember, betNumber: 1 },
      },
    },
    include: {
      owner: { select: { name: true } },
      _count: { select: { members: true } },
    },
  });

  return NextResponse.json({ group }, { status: 201 });
}
