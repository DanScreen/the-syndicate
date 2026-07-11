import { prisma } from "@the-syndicate/database";
import type { Prisma } from "@prisma/client";

type DbClient = Prisma.TransactionClient | typeof prisma;

/** Open a collecting round when none is active. Idempotent. */
export async function openCollectingRound(groupId: string, db: DbClient = prisma) {
  const existing = await db.round.findFirst({
    where: { groupId, status: { in: ["collecting", "locked"] } },
  });
  if (existing) return existing;

  const round = await db.round.create({
    data: { groupId, status: "collecting" },
  });

  await db.group.update({
    where: { id: groupId },
    data: { status: "collecting" },
  });

  return round;
}
