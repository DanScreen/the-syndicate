import { prisma } from "@tiki-acca/database";
import { Prisma } from "@prisma/client";
import type {
  AnalyticsChannel,
  AnalyticsEventType,
} from "@tiki-acca/shared";

type RecordEventInput = {
  type: AnalyticsEventType;
  userId?: string | null;
  channel?: AnalyticsChannel | null;
  path?: string | null;
};

export const VISIT_INACTIVITY_MS = 30 * 60 * 1000;
const MAX_ANALYTICS_PATH_LENGTH = 200;

export function normalizeAnalyticsPath(input: unknown): string | null {
  if (typeof input !== "string") return null;

  const withoutQuery = input.split(/[?#]/, 1)[0]?.trim();
  if (!withoutQuery?.startsWith("/")) return null;

  const segments = withoutQuery.split("/");
  if (
    segments[1] === "groups" &&
    segments[2] &&
    !["create", "join"].includes(segments[2])
  ) {
    segments[2] = "[id]";
  } else if (
    segments[1] === "blog" &&
    segments[2] &&
    segments[2] !== "tag"
  ) {
    segments[2] = "[slug]";
  }

  return segments.join("/").slice(0, MAX_ANALYTICS_PATH_LENGTH);
}

export async function recordAnalyticsEvent(input: RecordEventInput): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        type: input.type,
        userId: input.userId ?? undefined,
        channel: input.channel ?? undefined,
        path: input.path ?? undefined,
      },
    });
  } catch (err) {
    console.error("[analytics] failed to record event", input.type, err);
  }
}

export function recordAnalyticsEventAsync(input: RecordEventInput): void {
  void recordAnalyticsEvent(input);
}

type CustomerActivityInput = {
  type: "page_view" | "app_open";
  userId: string;
  channel: AnalyticsChannel;
  path?: string | null;
  now?: Date;
};

export async function recordCustomerActivity(
  input: CustomerActivityInput
): Promise<{ startedVisit: boolean }> {
  const now = input.now ?? new Date();
  const path = normalizeAnalyticsPath(input.path);

  return prisma.$transaction(async (tx) => {
    const lockKey = `analytics:${input.userId}:${input.channel}`;
    await tx.$executeRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`
    );

    const lastActivity = await tx.analyticsEvent.findFirst({
      where: {
        userId: input.userId,
        channel: input.channel,
        type: { in: ["page_view", "app_open"] },
      },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    const startedVisit =
      !lastActivity ||
      now.getTime() - lastActivity.createdAt.getTime() >= VISIT_INACTIVITY_MS;

    if (startedVisit) {
      await tx.analyticsEvent.create({
        data: {
          type: "visit",
          userId: input.userId,
          channel: input.channel,
          path: path ?? undefined,
          createdAt: now,
        },
      });
    }

    await tx.analyticsEvent.create({
      data: {
        type: input.type,
        userId: input.userId,
        channel: input.channel,
        path: path ?? undefined,
        createdAt: now,
      },
    });

    return { startedVisit };
  });
}
