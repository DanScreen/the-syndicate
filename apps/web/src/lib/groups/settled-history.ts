import { prisma } from "@tiki-acca/database";
import type { Prisma } from "@prisma/client";

/** Newest settled bet first; `id` breaks ties so paging never skips or repeats a round. */
export const SETTLED_ROUND_ORDER = [
  { settledAt: "desc" },
  { createdAt: "desc" },
  { id: "desc" },
] satisfies Prisma.RoundOrderByWithRelationInput[];

const settledRoundInclude = {
  legs: {
    include: { user: { select: { id: true, name: true } } },
  },
} as const;

/**
 * A page of a group's settled bets. `before` is the id of the last round the
 * caller already has; it must be one of this group's settled rounds, otherwise
 * this returns null. Without `limit` every remaining round is returned.
 */
export async function listSettledRounds(
  groupId: string,
  { before, limit }: { before?: string; limit?: number } = {}
) {
  const where = { groupId, status: "settled" };

  if (before) {
    const cursor = await prisma.round.findFirst({
      where: { ...where, id: before },
      select: { id: true },
    });
    if (!cursor) return null;
  }

  return prisma.round.findMany({
    where,
    orderBy: SETTLED_ROUND_ORDER,
    ...(before ? { cursor: { id: before }, skip: 1 } : {}),
    ...(limit ? { take: limit } : {}),
    include: settledRoundInclude,
  });
}
