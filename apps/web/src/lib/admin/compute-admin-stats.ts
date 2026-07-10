import { prisma } from "@the-syndicate/database";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function countEventsSince(type: string, since: Date): Promise<number> {
  return prisma.analyticsEvent.count({
    where: { type, createdAt: { gte: since } },
  });
}

export type AdminStats = {
  users: number;
  groups: number;
  picks: number;
  accas: number;
  accasLocked: number;
  accasSettled: number;
  accasSuccessful: number;
  accasFailed: number;
  signUpsLast7Days: number;
  signUpsLast30Days: number;
  loginsLast7Days: number;
  loginsLast30Days: number;
  pageViewsLast7Days: number;
  pageViewsLast30Days: number;
};

export async function computeAdminStats(): Promise<AdminStats> {
  const since7 = daysAgo(7);
  const since30 = daysAgo(30);

  const [
    users,
    groups,
    picks,
    accas,
    accasLocked,
    accasSettled,
    accasSuccessful,
    accasFailed,
    signUpsLast7Days,
    signUpsLast30Days,
    loginsLast7Days,
    loginsLast30Days,
    pageViewsLast7Days,
    pageViewsLast30Days,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.group.count(),
    prisma.leg.count(),
    prisma.round.count({ where: { status: { in: ["locked", "settled"] } } }),
    prisma.round.count({ where: { status: "locked" } }),
    prisma.round.count({ where: { status: "settled" } }),
    prisma.round.count({
      where: { status: "settled", profitLossGbp: { gt: 0 } },
    }),
    prisma.round.count({
      where: { status: "settled", profitLossGbp: { lte: 0 } },
    }),
    prisma.user.count({ where: { createdAt: { gte: since7 } } }),
    prisma.user.count({ where: { createdAt: { gte: since30 } } }),
    countEventsSince("login", since7),
    countEventsSince("login", since30),
    countEventsSince("page_view", since7),
    countEventsSince("page_view", since30),
  ]);

  return {
    users,
    groups,
    picks,
    accas,
    accasLocked,
    accasSettled,
    accasSuccessful,
    accasFailed,
    signUpsLast7Days,
    signUpsLast30Days,
    loginsLast7Days,
    loginsLast30Days,
    pageViewsLast7Days,
    pageViewsLast30Days,
  };
}
