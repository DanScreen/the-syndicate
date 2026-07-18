import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { prisma } from "@tiki-acca/database";
import {
  createAdditionalRound,
  RoundCreationError,
} from "./create-additional-round";

const groupIds: string[] = [];
const userIds: string[] = [];

async function createGroup(maxActiveBets: number, withLeg: boolean) {
  const user = await prisma.user.create({
    data: {
      firstName: "Round",
      lastName: "Tester",
      name: "Round Tester",
      email: `round-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`,
      passwordHash: "not-a-real-hash",
    },
  });
  userIds.push(user.id);

  const group = await prisma.group.create({
    data: {
      name: `Concurrent test ${Math.random().toString(36).slice(2)}`,
      inviteCode: Math.random().toString(36).slice(2, 12),
      ownerId: user.id,
      maxActiveBets,
      members: { create: { userId: user.id, role: "owner" } },
      rounds: {
        create: {
          status: "open",
          betNumber: 1,
          legs: withLeg
            ? {
                create: {
                  userId: user.id,
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
              }
            : undefined,
        },
      },
    },
  });
  groupIds.push(group.id);
  return { group, user };
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

describe("additional active bets", () => {
  it("keeps manual creation disabled when the owner limit is one", async () => {
    const { group, user } = await createGroup(1, true);
    await assert.rejects(
      createAdditionalRound(group.id, user.id),
      (error: unknown) =>
        error instanceof RoundCreationError && error.status === 403
    );
  });

  it("requires every existing open bet to contain a leg", async () => {
    const { group, user } = await createGroup(3, false);
    await assert.rejects(
      createAdditionalRound(group.id, user.id),
      (error: unknown) =>
        error instanceof RoundCreationError &&
        error.message.includes("empty open bet")
    );
  });

  it("lets a member create another numbered bet below the cap", async () => {
    const { group } = await createGroup(3, true);
    const member = await prisma.user.create({
      data: {
        firstName: "Member",
        lastName: "Tester",
        name: "Member Tester",
        email: `member-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`,
        passwordHash: "not-a-real-hash",
      },
    });
    userIds.push(member.id);
    await prisma.groupMember.create({
      data: { groupId: group.id, userId: member.id, role: "member" },
    });

    const round = await createAdditionalRound(group.id, member.id);
    assert.equal(round.betNumber, 2);
    assert.equal(round.status, "open");
  });

  it("atomically enforces the cap across simultaneous requests", async () => {
    const { group, user } = await createGroup(2, true);
    const results = await Promise.allSettled([
      createAdditionalRound(group.id, user.id),
      createAdditionalRound(group.id, user.id),
    ]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.equal(results.filter((result) => result.status === "rejected").length, 1);
    assert.equal(
      await prisma.round.count({
        where: { groupId: group.id, status: { in: ["open", "locked"] } },
      }),
      2
    );
  });
});
