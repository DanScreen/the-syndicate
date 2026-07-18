import { prisma } from "@tiki-acca/database";
import { Prisma } from "@prisma/client";

export class RoundCreationError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "RoundCreationError";
  }
}

/**
 * Creates another open bet under the owner's concurrency policy.
 * The advisory lock makes the cap and empty-bet checks atomic across requests.
 */
export async function createAdditionalRound(groupId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${groupId}))`
    );

    const membership = await tx.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      include: {
        group: {
          select: {
            legsPerMember: true,
            maxActiveBets: true,
          },
        },
      },
    });
    if (!membership) {
      throw new RoundCreationError("Not a member", 403);
    }
    if (membership.group.maxActiveBets <= 1) {
      throw new RoundCreationError(
        "The group owner has limited this group to one active bet",
        403
      );
    }

    const activeRounds = await tx.round.findMany({
      where: { groupId, status: { in: ["open", "locked"] } },
      select: {
        id: true,
        status: true,
        _count: { select: { legs: true } },
      },
    });
    if (activeRounds.length >= membership.group.maxActiveBets) {
      throw new RoundCreationError(
        `This group already has its maximum of ${membership.group.maxActiveBets} active bets`,
        409
      );
    }
    if (
      activeRounds.some(
        (round) => round.status === "open" && round._count.legs === 0
      )
    ) {
      throw new RoundCreationError(
        "Add at least one leg to the empty open bet before creating another",
        409
      );
    }

    const latestRound = await tx.round.aggregate({
      where: { groupId },
      _max: { betNumber: true },
    });
    const round = await tx.round.create({
      data: {
        groupId,
        betNumber: (latestRound._max.betNumber ?? 0) + 1,
        status: "open",
        legsPerMember: membership.group.legsPerMember,
      },
      include: { legs: true },
    });

    await tx.group.update({
      where: { id: groupId },
      data: { status: "open" },
    });

    return round;
  });
}
