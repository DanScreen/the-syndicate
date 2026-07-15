import { prisma } from "@tiki-acca/database";
import type { Prisma } from "@prisma/client";

type DbClient = Prisma.TransactionClient | typeof prisma;

/** Open a round for leg picks when none is active. Idempotent. */
export async function openRound(groupId: string, db: DbClient = prisma) {
  const existing = await db.round.findFirst({
    where: { groupId, status: { in: ["open", "locked"] } },
  });
  if (existing) return existing;

  const group = await db.group.findUniqueOrThrow({
    where: { id: groupId },
    select: { legsPerMember: true },
  });

  const round = await db.round.create({
    data: {
      groupId,
      status: "open",
      legsPerMember: group.legsPerMember,
    },
  });

  await db.group.update({
    where: { id: groupId },
    data: { status: "open" },
  });

  return round;
}
