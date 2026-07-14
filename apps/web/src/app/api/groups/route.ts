import { requireSession } from "@/lib/api-auth";
import { generateInviteCode } from "@/lib/invite-code";
import { activeLegsInRound, yourLegInRound } from "@/lib/groups/your-leg-summary";
import { openRound } from "@/lib/rounds/open-round";
import { groupNetPoints } from "@/lib/stats/helpers";
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
        allRounds.find((r) => r.status !== "settled") ?? null;
      let activeRound: {
        id: string;
        status: string;
        combinedOdds: number | null;
      } | null = activeRoundRow;
      if (!activeRound) {
        activeRound = await openRound(m.group.id);
      }

      const legs = activeRoundRow?.legs ?? [];

      return {
        id: m.group.id,
        name: m.group.name,
        inviteCode: m.group.inviteCode,
        role: m.role,
        memberCount: m.group._count.members,
        status: activeRound?.status ?? "open",
        ownerName: m.group.owner.name,
        groupPoints: groupNetPoints(allRounds),
        points: m.points,
        activeRound,
        activeLegs: activeLegsInRound(legs, userId),
        yourLeg: yourLegInRound(legs, userId),
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

  const group = await prisma.group.create({
    data: {
      name: parsed.data.name,
      inviteCode,
      status: "open",
      ownerId: session!.user!.id,
      members: {
        create: {
          userId: session!.user!.id,
          role: "owner",
        },
      },
      rounds: {
        create: { status: "open" },
      },
    },
    include: {
      owner: { select: { name: true } },
      _count: { select: { members: true } },
    },
  });

  return NextResponse.json({ group }, { status: 201 });
}
