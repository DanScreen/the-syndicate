import { requireSession } from "@/lib/api-auth";
import { generateInviteCode } from "@/lib/invite-code";
import { prisma } from "@the-syndicate/database";
import { createGroupSchema } from "@the-syndicate/shared";
import { NextResponse } from "next/server";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const memberships = await prisma.groupMember.findMany({
    where: { userId: session!.user!.id },
    include: {
      group: {
        include: {
          owner: { select: { name: true } },
          _count: { select: { members: true, rounds: true } },
          rounds: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const groups = memberships.map((m) => ({
    id: m.group.id,
    name: m.group.name,
    inviteCode: m.group.inviteCode,
    role: m.role,
    memberCount: m.group._count.members,
    status: m.group.status,
    ownerName: m.group.owner.name,
    points: m.points,
    activeRound: m.group.rounds[0] ?? null,
  }));

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
      maxMembers: parsed.data.maxMembers,
      inviteCode,
      ownerId: session!.user!.id,
      members: {
        create: {
          userId: session!.user!.id,
          role: "owner",
        },
      },
    },
    include: {
      owner: { select: { name: true } },
      _count: { select: { members: true } },
    },
  });

  return NextResponse.json({ group }, { status: 201 });
}
