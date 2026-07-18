import { prisma } from "@tiki-acca/database";
import { Prisma, type Round } from "@prisma/client";

type DbClient = Prisma.TransactionClient | typeof prisma;

/** Open a round for leg picks when none is active. Idempotent. */
export async function openRound(
  groupId: string,
  db: DbClient = prisma
): Promise<Round> {
  if (db === prisma) {
    return prisma.$transaction((tx) => openRound(groupId, tx));
  }

  await db.$executeRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${groupId}))`
  );

  const existing = await db.round.findFirst({
    where: { groupId, status: { in: ["open", "locked"] } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  const [group, latestRound] = await Promise.all([
    db.group.findUniqueOrThrow({
      where: { id: groupId },
      select: { legsPerMember: true },
    }),
    db.round.aggregate({
      where: { groupId },
      _max: { betNumber: true },
    }),
  ]);

  const round = await db.round.create({
    data: {
      groupId,
      betNumber: (latestRound._max.betNumber ?? 0) + 1,
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
