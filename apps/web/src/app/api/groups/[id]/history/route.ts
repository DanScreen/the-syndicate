import { requireSession } from "@/lib/api-auth";
import { serialized } from "@/lib/api-response";
import { groupHistoryQuerySchema, type GroupHistoryResponse } from "@tiki-acca/shared";
import { mapHistoryRound } from "@/lib/groups/map-history-round";
import { listSettledRounds } from "@/lib/groups/settled-history";
import { prisma } from "@tiki-acca/database";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

/** Settled bets, newest first. `?limit=&before=<roundId>` pages; no params returns them all. */
export async function GET(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;

  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: { groupId: id, userId: session!.user!.id },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const url = new URL(request.url);
  const query = groupHistoryQuerySchema.safeParse({
    before: url.searchParams.get("before") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!query.success) {
    return NextResponse.json({ error: query.error.flatten() }, { status: 400 });
  }

  const rounds = await listSettledRounds(id, query.data);
  if (!rounds) {
    return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
  }

  return NextResponse.json(
    serialized({
      rounds: rounds.map(mapHistoryRound),
    }) satisfies GroupHistoryResponse
  );
}
