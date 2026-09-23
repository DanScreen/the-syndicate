import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { prisma } from "@tiki-acca/database";
import { sendEmailToUser } from "./notifications/channels/email-channel";
import { removeUnverifiedAccount } from "./account-removal";
import { openRound } from "./rounds/open-round";

const groupIds: string[] = [];
const userIds: string[] = [];

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`;
}

async function createUser(prefix: string, verified = false) {
  const user = await prisma.user.create({
    data: {
      firstName: "Removal",
      lastName: "Tester",
      name: "Removal Tester",
      email: uniqueEmail(prefix),
      passwordHash: "not-a-real-hash",
      emailVerifiedAt: verified ? new Date() : null,
    },
  });
  userIds.push(user.id);
  return user;
}

async function createGroup(ownerId: string, memberIds: string[] = []) {
  const group = await prisma.group.create({
    data: {
      name: `Removal test ${Math.random().toString(36).slice(2)}`,
      inviteCode: Math.random().toString(36).slice(2, 12),
      ownerId,
      members: {
        create: [
          { userId: ownerId, role: "owner" },
          ...memberIds.map((userId) => ({ userId, role: "member" })),
        ],
      },
    },
  });
  groupIds.push(group.id);
  return group;
}

after(async () => {
  if (groupIds.length > 0) {
    await prisma.group.deleteMany({ where: { id: { in: groupIds } } });
  }
  if (userIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.$disconnect();
});

describe("removeUnverifiedAccount", () => {
  it("hard-deletes an account with no legs or chat, removing its memberships", async () => {
    const owner = await createUser("removal-owner", true);
    const junk = await createUser("removal-junk");
    const group = await createGroup(owner.id, [junk.id]);

    assert.equal(await removeUnverifiedAccount(junk.id), "deleted");
    assert.equal(await prisma.user.findUnique({ where: { id: junk.id } }), null);
    assert.equal(
      await prisma.groupMember.count({ where: { groupId: group.id } }),
      1
    );
  });

  it("anonymises an account with legs and takes it out of its groups", async () => {
    const owner = await createUser("removal-owner", true);
    const typo = await createUser("removal-typo");
    const group = await createGroup(owner.id, [typo.id]);
    const round = await openRound(group.id);
    await prisma.leg.create({
      data: {
        roundId: round.id,
        userId: typo.id,
        legIndex: 1,
        fixtureId: `fixture-${Math.random().toString(36).slice(2)}`,
        homeTeam: "Home FC",
        awayTeam: "Away FC",
        competitionId: "world-cup",
        competition: "World Cup",
        kickoff: new Date(Date.now() + 60 * 60 * 1000),
        marketType: "h2h",
        marketLabel: "Match result",
        selectionId: "home",
        selectionLabel: "Home FC",
        odds: 2,
        bookmakerId: "williamhill",
        bookmakerName: "William Hill",
      },
    });

    assert.equal(await removeUnverifiedAccount(typo.id), "anonymised");
    const tombstone = await prisma.user.findUniqueOrThrow({ where: { id: typo.id } });
    assert.equal(tombstone.name, "Former member");
    assert.match(tombstone.email, /@removed\.tikiacca\.com$/);
    assert.equal(await prisma.groupMember.count({ where: { userId: typo.id } }), 0);
    assert.equal(await prisma.leg.count({ where: { userId: typo.id } }), 1);
  });

  it("hands an owned group to the next member", async () => {
    const junkOwner = await createUser("removal-junk-owner");
    const mate = await createUser("removal-mate", true);
    const group = await createGroup(junkOwner.id, [mate.id]);

    await removeUnverifiedAccount(junkOwner.id);
    const updated = await prisma.group.findUniqueOrThrow({
      where: { id: group.id },
      include: { members: true },
    });
    assert.equal(updated.ownerId, mate.id);
    assert.deepEqual(
      updated.members.map((m) => [m.userId, m.role]),
      [[mate.id, "owner"]]
    );
  });
});

describe("notification email gating", () => {
  it("never emails an unconfirmed address", async () => {
    const user = await createUser("removal-unverified-email");
    assert.equal(await sendEmailToUser(user.id, "Subject", "<p>Hi</p>"), false);
  });
});
