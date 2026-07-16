import { lockRoundWithAccaPricing } from "@/lib/odds/lock-round";
import { isPastKickoffCutoff } from "@/lib/rounds/first-kickoff";
import { prisma } from "@tiki-acca/database";
import { Prisma } from "@prisma/client";
import {
  findRedundantMarketLegs,
  redundantMarketLegIds,
  type MarketRedundancy,
} from "@tiki-acca/shared";

export type DeleteRedundantMarketLegsResult = {
  removedLegIds: string[];
  conflicts: MarketRedundancy[];
};

/** Deletes later-submitted duplicate market-family legs. Does not reprice. */
export async function deleteRedundantMarketLegs(
  roundId: string
): Promise<DeleteRedundantMarketLegsResult> {
  const legs = await prisma.leg.findMany({ where: { roundId } });
  if (legs.length < 2) {
    return { removedLegIds: [], conflicts: [] };
  }

  const conflicts = findRedundantMarketLegs(legs);
  const removedLegIds = redundantMarketLegIds(legs);
  if (removedLegIds.length === 0) {
    return { removedLegIds: [], conflicts: [] };
  }

  await prisma.leg.deleteMany({
    where: { id: { in: removedLegIds }, roundId },
  });

  console.info(
    `[purge-duplicate-markets] round=${roundId} removed=${removedLegIds.length}`
  );

  return { removedLegIds, conflicts };
}

export type PurgeDuplicateMarketsResult = DeleteRedundantMarketLegsResult & {
  repriced: boolean;
};

/**
 * Removes later-submitted legs that share a market family on the same fixture.
 * Safe for open rounds and locked rounds still before first kickoff (reprices).
 * No-ops for settled rounds or locked rounds past kickoff — use data-maintenance
 * for those historical bets.
 */
export async function purgeDuplicateMarketsInRound(
  roundId: string
): Promise<PurgeDuplicateMarketsResult> {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { legs: true },
  });

  if (!round || round.legs.length < 2) {
    return { removedLegIds: [], conflicts: [], repriced: false };
  }

  if (round.status === "settled") {
    return { removedLegIds: [], conflicts: [], repriced: false };
  }

  if (round.status === "locked" && isPastKickoffCutoff(round.legs)) {
    return { removedLegIds: [], conflicts: [], repriced: false };
  }

  const { removedLegIds, conflicts } = await deleteRedundantMarketLegs(roundId);
  if (removedLegIds.length === 0) {
    return { removedLegIds: [], conflicts: [], repriced: false };
  }

  let repriced = false;
  if (round.status === "locked") {
    const remaining = await prisma.leg.findMany({ where: { roundId } });
    if (remaining.length > 0) {
      await lockRoundWithAccaPricing(roundId, remaining);
      repriced = true;
    } else {
      await prisma.round.update({
        where: { id: roundId },
        data: {
          status: "open",
          combinedOdds: null,
          bestBookmakerId: null,
          accaBookmakerRankings: Prisma.DbNull,
        },
      });
      await prisma.group.update({
        where: { id: round.groupId },
        data: { status: "open" },
      });
    }
  }

  return { removedLegIds, conflicts, repriced };
}
