import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { prisma } from "@tiki-acca/database";
import { listSettledRounds } from "./settled-history";

const groupIds: string[] = [];
const userIds: string[] = [];

async function createGroup() {
  const owner = await prisma.user.create({
    data: {
      firstName: "History",
      lastName: "Tester",
      name: "History Tester",
      email: `history-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`,
      passwordHash: "not-a-real-hash",
    },
  });
  userIds.push(owner.id);
  const group = await prisma.group.create({
    data: {
      name: `History test ${Math.random().toString(36).slice(2)}`,
      inviteCode: Math.random().toString(36).slice(2, 12),
      ownerId: owner.id,
      members: { create: { userId: owner.id, role: "owner" } },
    },
  });
  groupIds.push(group.id);
  return group;
}

async function settledRound(groupId: string, settledAt: Date) {
  return prisma.round.create({ data: { groupId, status: "settled", settledAt } });
}

after(async () => {
  await prisma.group.deleteMany({ where: { id: { in: groupIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("listSettledRounds", () => {
  it("pages through every settled bet, newest first, without gaps or repeats", async () => {
    const group = await createGroup();
    const base = Date.UTC(2026, 8, 1);
    // Two pairs share a settledAt, so paging has to break ties consistently.
    const settledTimes = [0, 1, 1, 2, 3, 3, 4].map((day) => new Date(base + day * 86_400_000));
    for (const settledAt of settledTimes) await settledRound(group.id, settledAt);
    await prisma.round.create({ data: { groupId: group.id, status: "open" } });

    const everything = await listSettledRounds(group.id);
    assert.ok(everything);
    assert.equal(everything.length, 7);
    const times = everything.map((round) => round.settledAt!.getTime());
    assert.deepEqual(times, [...times].sort((a, b) => b - a));

    const paged: string[] = [];
    let before: string | undefined;
    for (;;) {
      const page = await listSettledRounds(group.id, { before, limit: 3 });
      assert.ok(page);
      if (page.length === 0) break;
      assert.ok(page.length <= 3);
      paged.push(...page.map((round) => round.id));
      before = page.at(-1)!.id;
    }
    assert.deepEqual(paged, everything.map((round) => round.id));
  });

  it("rejects a cursor that isn't one of this group's settled bets", async () => {
    const group = await createGroup();
    const other = await createGroup();
    await settledRound(group.id, new Date());
    const open = await prisma.round.create({ data: { groupId: group.id, status: "open" } });
    const elsewhere = await settledRound(other.id, new Date());

    assert.equal(await listSettledRounds(group.id, { before: open.id, limit: 3 }), null);
    assert.equal(await listSettledRounds(group.id, { before: elsewhere.id, limit: 3 }), null);
    assert.equal(await listSettledRounds(group.id, { before: "missing", limit: 3 }), null);
  });
});
