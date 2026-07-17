import { requireSession } from "@/lib/api-auth";
import { serializeMessage } from "@/lib/chat/serialize";
import { isRateLimited, retryAfterSeconds } from "@/lib/rate-limit";
import { notifyChatMessage } from "@/lib/notifications/chat-notifications";
import { prisma } from "@tiki-acca/database";
import {
  MESSAGE_PAGE_SIZE,
  messagesQuerySchema,
  postMessageSchema,
  type RoundMessagesResponse,
} from "@tiki-acca/shared";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

const POST_LIMIT = 10;
const POST_WINDOW_MS = 60 * 1000;

const userSelect = { select: { id: true, name: true } } as const;
const messageInclude = {
  user: userSelect,
  reactions: {
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

async function markThreadRead(groupId: string, userId: string, readAt: Date) {
  await prisma.groupMember.updateMany({
    where: {
      groupId,
      userId,
      OR: [
        { lastReadMessageAt: null },
        { lastReadMessageAt: { lt: readAt } },
      ],
    },
    data: { lastReadMessageAt: readAt },
  });
}

/** Confirm the round exists and the caller is a member of its group. */
async function requireRoundMembership(roundId: string, userId: string) {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    select: { id: true, status: true, group: { select: { id: true } } },
  });
  if (!round) return { round: null, error: NextResponse.json({ error: "Round not found" }, { status: 404 }) };

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: round.group.id, userId } },
    select: { groupId: true },
  });
  if (!membership) {
    return { round: null, error: NextResponse.json({ error: "Not a member" }, { status: 403 }) };
  }
  return { round, error: null as NextResponse | null };
}

export async function GET(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const { round, error: memberError } = await requireRoundMembership(id, session!.user!.id);
  if (memberError) return memberError;

  const url = new URL(request.url);
  const parsedQuery = messagesQuerySchema.safeParse({
    after: url.searchParams.get("after") ?? undefined,
    before: url.searchParams.get("before") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsedQuery.success) {
    return NextResponse.json({ error: parsedQuery.error.flatten() }, { status: 400 });
  }

  const limit = parsedQuery.data.limit ?? MESSAGE_PAGE_SIZE;
  const after = parsedQuery.data.after;
  const before = parsedQuery.data.before;

  if (before) {
    const cursor = await prisma.roundMessage.findUnique({
      where: { id: before },
      select: { createdAt: true, roundId: true },
    });
    if (!cursor || cursor.roundId !== round!.id) {
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
    }
    const page = await prisma.roundMessage.findMany({
      where: {
        roundId: round!.id,
        OR: [
          { createdAt: { lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { lt: before } },
        ],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: messageInclude,
    });
    const hasMore = page.length > limit;
    const messages = page.slice(0, limit).reverse();
    const body: RoundMessagesResponse = {
      messages: messages.map((message) =>
        serializeMessage(message, session!.user!.id)
      ),
      hasMore,
    };
    return NextResponse.json(body);
  }

  // Incremental poll: return everything strictly after the cursor, in order.
  if (after) {
    const cursor = await prisma.roundMessage.findUnique({
      where: { id: after },
      select: { createdAt: true, roundId: true },
    });
    if (!cursor || cursor.roundId !== round!.id) {
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
    }
    const messages = await prisma.roundMessage.findMany({
      where: {
        roundId: round!.id,
        OR: [
          { createdAt: { gt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { gt: after } },
        ],
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: limit,
      include: messageInclude,
    });
    const newest = messages[messages.length - 1];
    if (round!.status !== "settled" || newest) {
      await markThreadRead(
        round!.group.id,
        session!.user!.id,
        round!.status === "settled" ? newest.createdAt : new Date()
      );
    }
    const body: RoundMessagesResponse = {
      messages: messages.map((message) => serializeMessage(message, session!.user!.id)),
    };
    return NextResponse.json(body);
  }

  // Initial load: the latest page, returned oldest-first (newest last).
  const [latest, latestAnnouncements] = await Promise.all([
    prisma.roundMessage.findMany({
      where: { roundId: round!.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: messageInclude,
    }),
    prisma.roundMessage.findMany({
      where: {
        roundId: round!.id,
        legId: { not: null },
        eventType: { in: ["leg_submitted", "leg_changed"] },
      },
      distinct: ["legId"],
      orderBy: [{ legId: "asc" }, { createdAt: "desc" }, { id: "desc" }],
      include: messageInclude,
    }),
  ]);
  const hasMore = latest.length > limit;
  const ordered = latest.slice(0, limit).sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id)
  );
  const newest = ordered[ordered.length - 1];
  if (round!.status !== "settled" || newest) {
    await markThreadRead(
      round!.group.id,
      session!.user!.id,
      round!.status === "settled" ? newest.createdAt : new Date()
    );
  }
  const body: RoundMessagesResponse = {
    messages: ordered.map((message) => serializeMessage(message, session!.user!.id)),
    legAnnouncements: latestAnnouncements.map((message) =>
      serializeMessage(message, session!.user!.id)
    ),
    hasMore,
  };
  return NextResponse.json(body);
}

export async function POST(request: Request, { params }: Params) {
  const { session, error } = await requireSession();
  if (error) return error;

  const { id } = await params;
  const userId = session!.user!.id;

  const { round, error: memberError } = await requireRoundMembership(id, userId);
  if (memberError) return memberError;
  if (round!.status === "settled") {
    return NextResponse.json(
      { error: "Settled round threads are read-only" },
      { status: 409 }
    );
  }

  const key = `chat-post:${userId}`;
  if (isRateLimited(key, POST_LIMIT, POST_WINDOW_MS)) {
    return NextResponse.json(
      { error: "You're posting too fast. Slow down a moment." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds(key)) } }
    );
  }

  const raw = await request.json().catch(() => null);
  const parsed = postMessageSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const message = await prisma.roundMessage.create({
    data: {
      roundId: round!.id,
      userId,
      kind: "user",
      body: parsed.data.body,
    },
    include: messageInclude,
  });

  await notifyChatMessage({ roundId: round!.id, senderId: userId }).catch((err) => {
    console.error("[chat] push notification failed", err);
  });

  return NextResponse.json(
    { message: serializeMessage(message, userId) },
    { status: 201 }
  );
}
