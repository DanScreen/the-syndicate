import { requireSession } from "@/lib/api-auth";
import {
  getGroupMessages,
  postGroupMessage,
} from "@/lib/chat/group-thread-route";
import { prisma } from "@tiki-acca/database";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

async function groupIdForRound(roundId: string) {
  return prisma.round.findUnique({
    where: { id: roundId },
    select: { groupId: true },
  });
}

/**
 * Compatibility route for older mobile clients. Round URLs now resolve to the
 * containing group's longstanding chat rather than a separate bet thread.
 */
export async function GET(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;
  const { id } = await params;
  const round = await groupIdForRound(id);
  if (!round) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }
  return getGroupMessages(request, round.groupId, session!.user!.id);
}

export async function POST(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;
  const { id } = await params;
  const round = await groupIdForRound(id);
  if (!round) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }
  return postGroupMessage(request, round.groupId, session!.user!.id);
}
