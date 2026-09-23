import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { prisma } from "@tiki-acca/database";
import { lockSoloRound } from "./lock-solo-round";
import { openRound } from "./open-round";

const groupIds: string[] = [];
const userIds: string[] = [];

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`;
}

async function createUser(prefix: string) {
  const user = await prisma.user.create({
    data: {
      firstName: "Lock",
      lastName: "Tester",
      name: "Lock Tester",
      email: uniqueEmail(prefix),
      passwordHash: "not-a-real-hash",
    },
  });
  userIds.push(user.id);
  return user;
}

async function createGroup(memberCount: number) {
  const owner = await createUser("lock-owner");
  const group = await prisma.group.create({
    data: {
      name: `Lock test ${Math.random().toString(36).slice(2)}`,
      inviteCode: Math.random().toString(36).slice(2, 12),
      ownerId: owner.id,
      members: { create: { userId: owner.id, role: "owner" } },
    },
  });
  groupIds.push(group.id);

  for (let i = 1; i < memberCount; i++) {
    const mate = await createUser("lock-mate");
    await prisma.groupMember.create({
      data: { groupId: group.id, userId: mate.id, role: "member" },
    });
  }

  const round = await openRound(group.id);
  return { group, owner, round };
}

async function addLeg(
  roundId: string,
  userId: string,
  legIndex: number,
  kickoff = new Date(Date.now() + 60 * 60 * 1000)
) {
  return prisma.leg.create({
    data: {
      roundId,
      userId,
      legIndex,
      fixtureId: `fixture-${legIndex}-${Math.random().toString(36).slice(2)}`,
      homeTeam: "Home FC",
      awayTeam: "Away FC",
      competitionId: "world-cup",
      competition: "World Cup",
      kickoff,
      marketType: "h2h",
      marketLabel: "Match result",
      selectionId: "home",
      selectionLabel: "Home FC",
      odds: 2,
      bookmakerId: "williamhill",
      bookmakerName: "William Hill",
    },
  });
}

async function roundStatus(roundId: string) {
  const round = await prisma.round.findUniqueOrThrow({ where: { id: roundId } });
  return round.status;
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

describe("lockSoloRound (POST /api/rounds/[id]/lock)", () => {
  it("locks a solo round with one or more legs", async () => {
    const { owner, round } = await createGroup(1);
    await addLeg(round.id, owner.id, 1);
    await addLeg(round.id, owner.id, 2);

    const result = await lockSoloRound(round.id, owner.id);
    assert.deepEqual(result, { ok: true });
    assert.equal(await roundStatus(round.id), "locked");
  });

  it("returns 400 when the solo round has no legs", async () => {
    const { owner, round } = await createGroup(1);

    const result = await lockSoloRound(round.id, owner.id);
    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.status, 400);
    assert.equal(await roundStatus(round.id), "open");
  });

  it("returns 403 on a non-unlimited (multi-member) round", async () => {
    const { owner, round } = await createGroup(2);
    await addLeg(round.id, owner.id, 1);

    const result = await lockSoloRound(round.id, owner.id);
    assert.equal(!result.ok && result.status, 403);
    assert.equal(await roundStatus(round.id), "open");
  });

  it("returns 403 for a non-member", async () => {
    const { owner, round } = await createGroup(1);
    await addLeg(round.id, owner.id, 1);
    const outsider = await createUser("lock-outsider");

    const result = await lockSoloRound(round.id, outsider.id);
    assert.equal(!result.ok && result.status, 403);
    assert.equal(await roundStatus(round.id), "open");
  });

  it("returns 400 when the round is not open", async () => {
    const { owner, round } = await createGroup(1);
    await addLeg(round.id, owner.id, 1);
    await prisma.round.update({ where: { id: round.id }, data: { status: "locked" } });

    const result = await lockSoloRound(round.id, owner.id);
    assert.equal(!result.ok && result.status, 400);
  });

  it("returns 404 for an unknown round", async () => {
    const owner = await createUser("lock-nobody");
    const result = await lockSoloRound("does-not-exist", owner.id);
    assert.equal(!result.ok && result.status, 404);
  });

  it("returns 409 but still locks when past the first kickoff", async () => {
    const { owner, round } = await createGroup(1);
    await addLeg(round.id, owner.id, 1, new Date(Date.now() - 60 * 1000));

    const result = await lockSoloRound(round.id, owner.id);
    assert.equal(!result.ok && result.status, 409);
    assert.equal(await roundStatus(round.id), "locked");
  });
});
