import { serializeMessage } from "@/lib/chat/serialize";
import { notifyChatMessage } from "@/lib/notifications/chat-notifications";
import { isRateLimited, retryAfterSeconds } from "@/lib/rate-limit";
import { prisma } from "@tiki-acca/database";
import {
  MESSAGE_PAGE_SIZE,
  messagesQuerySchema,
  postMessageSchema,
  type GroupMessagesResponse,
} from "@tiki-acca/shared";
import { NextResponse } from "next/server";

const POST_LIMIT = 10;
const POST_WINDOW_MS = 60 * 1000;

const messageInclude = {
  user: { select: { id: true, name: true } },
  round: { select: { betNumber: true } },
  reactions: {
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

async function requireGroupMembership(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { id: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }
  return null;
}

async function markGroupChatRead(groupId: string, userId: string) {
  const readAt = new Date();
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

/** Hide user messages from authors this member has blocked (App Review 1.2). */
async function blockedAuthorFilter(userId: string) {
  const blocks = await prisma.userBlock.findMany({
    where: { blockerId: userId },
    select: { blockedId: true },
  });
  if (blocks.length === 0) return {};
  return {
    NOT: { kind: "user", userId: { in: blocks.map((b) => b.blockedId) } },
  };
}

export async function getGroupMessages(
  request: Request,
  groupId: string,
  userId: string
) {
  const memberError = await requireGroupMembership(groupId, userId);
  if (memberError) return memberError;

  const notBlocked = await blockedAuthorFilter(userId);

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
      select: { createdAt: true, groupId: true },
    });
    if (!cursor || cursor.groupId !== groupId) {
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
    }
    const page = await prisma.roundMessage.findMany({
      where: {
        groupId,
        ...notBlocked,
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
    const body: GroupMessagesResponse = {
      messages: messages.map((message) => serializeMessage(message, userId)),
      hasMore,
    };
    return NextResponse.json(body);
  }

  if (after) {
    const cursor = await prisma.roundMessage.findUnique({
      where: { id: after },
      select: { createdAt: true, groupId: true },
    });
    if (!cursor || cursor.groupId !== groupId) {
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
    }
    const messages = await prisma.roundMessage.findMany({
      where: {
        groupId,
        ...notBlocked,
        OR: [
          { createdAt: { gt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { gt: after } },
        ],
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: limit,
      include: messageInclude,
    });
    await markGroupChatRead(groupId, userId);
    const body: GroupMessagesResponse = {
      messages: messages.map((message) => serializeMessage(message, userId)),
    };
    return NextResponse.json(body);
  }

  const [latest, latestAnnouncements] = await Promise.all([
    prisma.roundMessage.findMany({
      where: { groupId, ...notBlocked },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: messageInclude,
    }),
    prisma.roundMessage.findMany({
      where: {
        groupId,
        ...notBlocked,
        round: { status: { in: ["open", "locked"] } },
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
    (a, b) =>
      a.createdAt.getTime() - b.createdAt.getTime() ||
      a.id.localeCompare(b.id)
  );
  await markGroupChatRead(groupId, userId);
  const body: GroupMessagesResponse = {
    messages: ordered.map((message) => serializeMessage(message, userId)),
    legAnnouncements: latestAnnouncements.map((message) =>
      serializeMessage(message, userId)
    ),
    hasMore,
  };
  return NextResponse.json(body);
}

export async function postGroupMessage(
  request: Request,
  groupId: string,
  userId: string
) {
  const memberError = await requireGroupMembership(groupId, userId);
  if (memberError) return memberError;

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
    const flat = parsed.error.flatten();
    const message =
      flat.fieldErrors.body?.[0] ?? flat.formErrors[0] ?? "Invalid message";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const message = await prisma.roundMessage.create({
    data: {
      groupId,
      userId,
      kind: "user",
      body: parsed.data.body,
    },
    include: messageInclude,
  });

  await notifyChatMessage({ groupId, senderId: userId }).catch((err) => {
    console.error("[chat] push notification failed", err);
  });

  return NextResponse.json(
    { message: serializeMessage(message, userId) },
    { status: 201 }
  );
}
