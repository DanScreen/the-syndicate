import { prisma } from "@tiki-acca/database";
import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const userId = `chat-group-user-${suffix}`;
const groupId = `chat-group-${suffix}`;
const roundId = `chat-round-${suffix}`;
const legacyMessageId = `chat-legacy-${suffix}`;

after(async () => {
  await prisma.group.deleteMany({ where: { id: groupId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("longstanding group chat storage", () => {
  it("keeps messages when round context is deleted and removes them with the group", async () => {
    await prisma.user.create({
      data: {
        id: userId,
        firstName: "Chat",
        lastName: "Tester",
        name: "Chat Tester",
        email: `${userId}@example.com`,
        passwordHash: "test",
      },
    });
    await prisma.group.create({
      data: {
        id: groupId,
        name: "Chat group",
        inviteCode: `CHAT-${suffix}`,
        ownerId: userId,
        members: {
          create: { userId, role: "owner" },
        },
        rounds: {
          create: { id: roundId, betNumber: 1 },
        },
      },
    });

    await prisma.roundMessage.createMany({
      data: [
        {
          groupId,
          userId,
          kind: "user",
          body: "A permanent group message",
        },
        {
          groupId,
          roundId,
          kind: "system",
          eventType: "round_locked",
          body: "Bet context",
        },
      ],
    });

    // Simulate an old app revision during a rolling deploy: it knows only
    // roundId. The database trigger must derive groupId before constraints run.
    await prisma.$executeRaw`
      INSERT INTO "RoundMessage" ("id", "roundId", "kind", "body")
      VALUES (${legacyMessageId}, ${roundId}, 'system', 'Legacy writer')
    `;
    const legacyMessage = await prisma.roundMessage.findUniqueOrThrow({
      where: { id: legacyMessageId },
    });
    assert.equal(legacyMessage.groupId, groupId);

    await prisma.round.delete({ where: { id: roundId } });

    const surviving = await prisma.roundMessage.findMany({
      where: { groupId },
      orderBy: { kind: "asc" },
    });
    assert.equal(surviving.length, 3);
    assert.equal(surviving.find((message) => message.kind === "user")?.roundId, null);
    assert.equal(surviving.find((message) => message.kind === "system")?.roundId, null);

    await prisma.group.delete({ where: { id: groupId } });
    assert.equal(await prisma.roundMessage.count({ where: { groupId } }), 0);
  });
});
