import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { prisma } from "@tiki-acca/database";
import {
  SOLO_MAX_LEGS,
  allMembersFilledQuota,
  effectiveLegQuota,
} from "@tiki-acca/shared";
import { openRound } from "./open-round";
import { createAdditionalRound } from "./create-additional-round";
import { convertSoloRoundsToGroup } from "./convert-solo-rounds";

/** Mirrors POST /api/groups/join: add the member, hand any solo acca over. */
async function joinGroup(groupId: string, userId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.groupMember.create({
      data: { groupId, userId, role: "member" },
    });
    await convertSoloRoundsToGroup(groupId, tx);
  });
}

const groupIds: string[] = [];
const userIds: string[] = [];

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`;
}

async function createUser(prefix: string) {
  const user = await prisma.user.create({
    data: {
      firstName: "Solo",
      lastName: "Tester",
      name: "Solo Tester",
      email: uniqueEmail(prefix),
      passwordHash: "not-a-real-hash",
    },
  });
  userIds.push(user.id);
  return user;
}

/** Group with no rounds yet, so openRound() does the snapshotting. */
async function createGroup(memberCount: number, maxActiveBets = 1) {
  const owner = await createUser("solo-owner");
  const group = await prisma.group.create({
    data: {
      name: `Solo test ${Math.random().toString(36).slice(2)}`,
      inviteCode: Math.random().toString(36).slice(2, 12),
      ownerId: owner.id,
      maxActiveBets,
      members: { create: { userId: owner.id, role: "owner" } },
    },
  });
  groupIds.push(group.id);

  for (let i = 1; i < memberCount; i++) {
    const mate = await createUser("solo-mate");
    await prisma.groupMember.create({
      data: { groupId: group.id, userId: mate.id, role: "member" },
    });
  }

  return { group, owner };
}

async function addLeg(roundId: string, userId: string, legIndex: number) {
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

describe("solo round snapshot", () => {
  it("flags a round opened in a one-member group", async () => {
    const { group } = await createGroup(1);
    const round = await openRound(group.id);
    assert.equal(round.unlimitedLegs, true);
    assert.equal(effectiveLegQuota(round), SOLO_MAX_LEGS);
  });

  it("does not flag a round opened in a two-member group", async () => {
    const { group } = await createGroup(2);
    const round = await openRound(group.id);
    assert.equal(round.unlimitedLegs, false);
    assert.equal(effectiveLegQuota(round), round.legsPerMember);
  });

  it("flags additional bets created in a one-member group", async () => {
    const { group, owner } = await createGroup(1, 3);
    const first = await openRound(group.id);
    await addLeg(first.id, owner.id, 1);

    const second = await createAdditionalRound(group.id, owner.id);
    assert.equal(second.unlimitedLegs, true);
  });

  it("hands the acca over to the group when a second member joins", async () => {
    const { group, owner } = await createGroup(1);
    const round = await openRound(group.id);
    assert.equal(round.unlimitedLegs, true);

    // The solo member has already built past what the group quota allows.
    for (let i = 1; i <= 4; i++) await addLeg(round.id, owner.id, i);

    const mate = await createUser("solo-joiner");
    await joinGroup(group.id, mate.id);

    const reloaded = await prisma.round.findUniqueOrThrow({
      where: { id: round.id },
      include: { legs: true },
    });

    assert.equal(reloaded.unlimitedLegs, false, "flag cleared on join");
    assert.equal(
      effectiveLegQuota(reloaded),
      reloaded.legsPerMember,
      "quota reverts to the round's snapshot for both members"
    );
    assert.equal(
      reloaded.legs.length,
      4,
      "legs already submitted stand even though they exceed the new quota"
    );
  });

  it("caps the handed-over acca at the group quota, not 2 x SOLO_MAX_LEGS", async () => {
    const { group, owner } = await createGroup(1);
    const round = await openRound(group.id);
    await addLeg(round.id, owner.id, 1);

    const mate = await createUser("solo-joiner");
    await joinGroup(group.id, mate.id);

    const reloaded = await prisma.round.findUniqueOrThrow({
      where: { id: round.id },
    });
    const quota = effectiveLegQuota(reloaded);
    assert.ok(
      quota * 2 <= SOLO_MAX_LEGS,
      `two members at quota ${quota} must not exceed the ${SOLO_MAX_LEGS}-leg betslip cap`
    );
  });

  it("locks once the new member submits, via the normal quota path", async () => {
    const { group, owner } = await createGroup(1);
    const round = await openRound(group.id);
    await addLeg(round.id, owner.id, 1);

    const mate = await createUser("solo-joiner");
    await joinGroup(group.id, mate.id);

    const reloaded = await prisma.round.findUniqueOrThrow({
      where: { id: round.id },
      include: { legs: true },
    });
    const memberUserIds = [owner.id, mate.id];
    const legsPerMember = effectiveLegQuota(reloaded);

    assert.equal(
      allMembersFilledQuota({ memberUserIds, legs: reloaded.legs, legsPerMember }),
      false,
      "does not lock while the new member still owes a leg"
    );

    await addLeg(round.id, mate.id, 1);
    const withMate = await prisma.round.findUniqueOrThrow({
      where: { id: round.id },
      include: { legs: true },
    });
    assert.equal(
      allMembersFilledQuota({ memberUserIds, legs: withMate.legs, legsPerMember }),
      true,
      "locks as soon as the new member has filled the group quota"
    );
  });

  it("leaves a locked solo round's flag alone as a record", async () => {
    const { group, owner } = await createGroup(1);
    const round = await openRound(group.id);
    await addLeg(round.id, owner.id, 1);
    await prisma.round.update({
      where: { id: round.id },
      data: { status: "locked" },
    });

    const mate = await createUser("solo-joiner");
    await joinGroup(group.id, mate.id);

    const reloaded = await prisma.round.findUniqueOrThrow({
      where: { id: round.id },
    });
    assert.equal(reloaded.unlimitedLegs, true);
  });

  it("is a no-op for a group with no solo rounds", async () => {
    const { group } = await createGroup(2);
    const round = await openRound(group.id);
    assert.equal(round.unlimitedLegs, false);

    const converted = await convertSoloRoundsToGroup(group.id);
    assert.equal(converted, 0);
  });

  it("opens later rounds under normal group rules", async () => {
    const { group, owner } = await createGroup(1);
    const first = await openRound(group.id);
    await addLeg(first.id, owner.id, 1);

    const mate = await createUser("solo-joiner");
    await joinGroup(group.id, mate.id);
    await prisma.round.update({
      where: { id: first.id },
      data: { status: "settled" },
    });

    const next = await openRound(group.id);
    assert.notEqual(next.id, first.id);
    assert.equal(next.unlimitedLegs, false);
  });
});
