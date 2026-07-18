import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { prisma } from "@tiki-acca/database";
import {
  normalizeAnalyticsPath,
  recordCustomerActivity,
  VISIT_INACTIVITY_MS,
} from "./analytics";
import { analyticsChannelFromAuthorization } from "./analytics-channel";
import { computeUserActivity } from "./admin/compute-user-activity";

const userIds: string[] = [];

async function createUser(prefix: string) {
  const unique = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const user = await prisma.user.create({
    data: {
      firstName: prefix,
      lastName: "Analytics",
      name: `${prefix} Analytics`,
      email: `${unique}@example.test`,
      passwordHash: "not-a-real-hash",
    },
  });
  userIds.push(user.id);
  return user;
}

after(async () => {
  if (userIds.length > 0) {
    await prisma.analyticsEvent.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.$disconnect();
});

describe("customer activity analytics", () => {
  it("sanitises paths without retaining query strings or dynamic IDs", () => {
    assert.equal(
      normalizeAnalyticsPath("/groups/cmf123/chat?invite=secret#latest"),
      "/groups/[id]/chat"
    );
    assert.equal(normalizeAnalyticsPath("/groups/create"), "/groups/create");
    assert.equal(normalizeAnalyticsPath("/blog/my-post?campaign=x"), "/blog/[slug]");
    assert.equal(normalizeAnalyticsPath("https://example.com/private"), null);
  });

  it("derives web and mobile channels from server authentication", () => {
    assert.equal(analyticsChannelFromAuthorization(null), "web");
    assert.equal(analyticsChannelFromAuthorization("Bearer ms_token"), "mobile");
    assert.equal(analyticsChannelFromAuthorization("Basic credentials"), "web");
  });

  it("starts a new visit only after 30 minutes without activity", async () => {
    const user = await createUser("Boundary");
    const startedAt = new Date("2026-07-18T12:00:00.000Z");

    const first = await recordCustomerActivity({
      type: "page_view",
      userId: user.id,
      channel: "web",
      path: "/dashboard",
      now: startedAt,
    });
    const second = await recordCustomerActivity({
      type: "page_view",
      userId: user.id,
      channel: "web",
      path: "/performance",
      now: new Date(startedAt.getTime() + VISIT_INACTIVITY_MS - 1),
    });
    const third = await recordCustomerActivity({
      type: "page_view",
      userId: user.id,
      channel: "web",
      path: "/account",
      now: new Date(startedAt.getTime() + 2 * VISIT_INACTIVITY_MS),
    });

    assert.equal(first.startedVisit, true);
    assert.equal(second.startedVisit, false);
    assert.equal(third.startedVisit, true);
  });

  it("deduplicates simultaneous visit starts", async () => {
    const user = await createUser("Concurrent");
    const now = new Date("2026-07-18T13:00:00.000Z");

    await Promise.all([
      recordCustomerActivity({
        type: "page_view",
        userId: user.id,
        channel: "mobile",
        path: "/home",
        now,
      }),
      recordCustomerActivity({
        type: "app_open",
        userId: user.id,
        channel: "mobile",
        path: "/home",
        now,
      }),
    ]);

    assert.equal(
      await prisma.analyticsEvent.count({
        where: { userId: user.id, channel: "mobile", type: "visit" },
      }),
      1
    );
  });

  it("aggregates each user's web, mobile and legacy activity separately", async () => {
    const user = await createUser("Report");
    await prisma.analyticsEvent.createMany({
      data: [
        { userId: user.id, type: "login", channel: "web" },
        { userId: user.id, type: "login", channel: "mobile" },
        { userId: user.id, type: "login" },
        { userId: user.id, type: "visit", channel: "web" },
        { userId: user.id, type: "page_view", channel: "web", path: "/dashboard" },
        { userId: user.id, type: "visit", channel: "mobile" },
        { userId: user.id, type: "page_view", channel: "mobile", path: "/home" },
      ],
    });

    const report = await computeUserActivity({ query: user.email });
    assert.equal(report.totalUsers, 1);
    assert.deepEqual(
      {
        webLogins: report.users[0]?.webLogins,
        mobileLogins: report.users[0]?.mobileLogins,
        legacyLogins: report.users[0]?.legacyLogins,
        webVisits: report.users[0]?.webVisits,
        mobileVisits: report.users[0]?.mobileVisits,
        webViews: report.users[0]?.webViews,
        mobileViews: report.users[0]?.mobileViews,
      },
      {
        webLogins: 1,
        mobileLogins: 1,
        legacyLogins: 1,
        webVisits: 1,
        mobileVisits: 1,
        webViews: 1,
        mobileViews: 1,
      }
    );
  });
});
