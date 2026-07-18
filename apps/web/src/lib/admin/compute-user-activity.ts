import { prisma } from "@tiki-acca/database";
import { Prisma } from "@prisma/client";
import type { AnalyticsChannel } from "@tiki-acca/shared";

export const USER_ACTIVITY_PAGE_SIZE = 25;

export type UserActivitySort =
  | "name"
  | "joined"
  | "webLogins"
  | "webVisits"
  | "webViews"
  | "mobileLogins"
  | "mobileVisits"
  | "mobileViews"
  | "lastLogin"
  | "lastActive";

export type UserActivityEntry = {
  userId: string;
  name: string;
  email: string;
  joinedAt: Date;
  webLogins: number;
  mobileLogins: number;
  legacyLogins: number;
  webVisits: number;
  mobileVisits: number;
  webViews: number;
  mobileViews: number;
  lastLoginAt: Date | null;
  lastActiveAt: Date | null;
};

export type UserActivityResult = {
  users: UserActivityEntry[];
  page: number;
  pageSize: number;
  totalUsers: number;
  totalPages: number;
  query: string;
  channel: AnalyticsChannel | "all";
  sort: UserActivitySort;
  direction: "asc" | "desc";
};

type ComputeUserActivityInput = {
  page?: number;
  query?: string;
  channel?: string;
  sort?: string;
  direction?: string;
};

type ActivityRow = UserActivityEntry;

const SORT_COLUMNS: Record<UserActivitySort, Prisma.Sql> = {
  name: Prisma.sql`u."name"`,
  joined: Prisma.sql`u."createdAt"`,
  webLogins: Prisma.sql`COALESCE(a."webLogins", 0)`,
  webVisits: Prisma.sql`COALESCE(a."webVisits", 0)`,
  webViews: Prisma.sql`COALESCE(a."webViews", 0)`,
  mobileLogins: Prisma.sql`COALESCE(a."mobileLogins", 0)`,
  mobileVisits: Prisma.sql`COALESCE(a."mobileVisits", 0)`,
  mobileViews: Prisma.sql`COALESCE(a."mobileViews", 0)`,
  lastLogin: Prisma.sql`a."lastLoginAt"`,
  lastActive: Prisma.sql`a."lastActiveAt"`,
};

function isSort(value: string | undefined): value is UserActivitySort {
  return !!value && value in SORT_COLUMNS;
}

export async function computeUserActivity(
  input: ComputeUserActivityInput = {}
): Promise<UserActivityResult> {
  const query = input.query?.trim().slice(0, 100) ?? "";
  const channel: AnalyticsChannel | "all" =
    input.channel === "web" || input.channel === "mobile"
      ? input.channel
      : "all";
  const sort: UserActivitySort = isSort(input.sort) ? input.sort : "lastActive";
  const direction = input.direction === "asc" ? "asc" : "desc";
  const requestedPage = Math.max(1, Math.floor(input.page ?? 1));
  const searchPattern = `%${query}%`;

  const searchWhere = query
    ? Prisma.sql`AND (u."name" ILIKE ${searchPattern} OR u."email" ILIKE ${searchPattern})`
    : Prisma.empty;
  const channelWhere =
    channel === "all"
      ? Prisma.empty
      : Prisma.sql`AND EXISTS (
          SELECT 1 FROM "AnalyticsEvent" filtered
          WHERE filtered."userId" = u."id" AND filtered."channel" = ${channel}
        )`;

  const [{ count }] = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS count
    FROM "User" u
    WHERE 1 = 1
    ${searchWhere}
    ${channelWhere}
  `);
  const totalUsers = Number(count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalUsers / USER_ACTIVITY_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * USER_ACTIVITY_PAGE_SIZE;
  const orderDirection =
    direction === "asc" ? Prisma.sql`ASC NULLS LAST` : Prisma.sql`DESC NULLS LAST`;

  const users = await prisma.$queryRaw<ActivityRow[]>(Prisma.sql`
    WITH activity AS (
      SELECT
        e."userId",
        COUNT(*) FILTER (WHERE e."type" = 'login' AND e."channel" = 'web')::int AS "webLogins",
        COUNT(*) FILTER (WHERE e."type" = 'login' AND e."channel" = 'mobile')::int AS "mobileLogins",
        COUNT(*) FILTER (WHERE e."type" = 'login' AND e."channel" IS NULL)::int AS "legacyLogins",
        COUNT(*) FILTER (WHERE e."type" = 'visit' AND e."channel" = 'web')::int AS "webVisits",
        COUNT(*) FILTER (WHERE e."type" = 'visit' AND e."channel" = 'mobile')::int AS "mobileVisits",
        COUNT(*) FILTER (WHERE e."type" = 'page_view' AND e."channel" = 'web')::int AS "webViews",
        COUNT(*) FILTER (WHERE e."type" = 'page_view' AND e."channel" = 'mobile')::int AS "mobileViews",
        MAX(e."createdAt") FILTER (WHERE e."type" = 'login') AS "lastLoginAt",
        MAX(e."createdAt") FILTER (
          WHERE e."type" IN ('page_view', 'app_open', 'visit', 'login')
        ) AS "lastActiveAt"
      FROM "AnalyticsEvent" e
      WHERE e."userId" IS NOT NULL
      GROUP BY e."userId"
    )
    SELECT
      u."id" AS "userId",
      u."name",
      u."email",
      u."createdAt" AS "joinedAt",
      COALESCE(a."webLogins", 0)::int AS "webLogins",
      COALESCE(a."mobileLogins", 0)::int AS "mobileLogins",
      COALESCE(a."legacyLogins", 0)::int AS "legacyLogins",
      COALESCE(a."webVisits", 0)::int AS "webVisits",
      COALESCE(a."mobileVisits", 0)::int AS "mobileVisits",
      COALESCE(a."webViews", 0)::int AS "webViews",
      COALESCE(a."mobileViews", 0)::int AS "mobileViews",
      a."lastLoginAt",
      a."lastActiveAt"
    FROM "User" u
    LEFT JOIN activity a ON a."userId" = u."id"
    WHERE 1 = 1
    ${searchWhere}
    ${channelWhere}
    ORDER BY ${SORT_COLUMNS[sort]} ${orderDirection}, u."name" ASC
    LIMIT ${USER_ACTIVITY_PAGE_SIZE}
    OFFSET ${offset}
  `);

  return {
    users,
    page,
    pageSize: USER_ACTIVITY_PAGE_SIZE,
    totalUsers,
    totalPages,
    query,
    channel,
    sort,
    direction,
  };
}
