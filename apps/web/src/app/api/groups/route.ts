import { requireSession } from "@/lib/api-auth";
import { generateInviteCode } from "@/lib/invite-code";
import { listGroupSummaries } from "@/lib/groups/list-group-summaries";
import { prisma } from "@tiki-acca/database";
import { createGroupSchema, type GroupsListResponse } from "@tiki-acca/shared";
import { NextResponse } from "next/server";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const groups = await listGroupSummaries(session!.user!.id);
  return NextResponse.json({ groups } satisfies GroupsListResponse);
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
