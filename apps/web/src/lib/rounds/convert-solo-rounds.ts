import { prisma } from "@tiki-acca/database";
import { Prisma } from "@prisma/client";

type DbClient = Prisma.TransactionClient | typeof prisma;

/**
 * Hand a solo acca over to the group when a second member joins.
 *
 * A round opened in a one-member group carries `unlimitedLegs`, which gives
 * *every* member of that round a quota of `SOLO_MAX_LEGS` and lets any member
 * lock it by hand. Left set after a join it would:
 *
 * - allow a 2 x SOLO_MAX_LEGS acca, past the selection limit bookmakers accept
 *   (the reason the cap exists — a longer betslip cannot be placed);
 * - let the member who just joined lock the original member's acca out from
 *   under them;
 * - keep the member-progress list hidden, exactly when it starts to matter.
 *
 * Clearing the flag restores the round's snapshot `legsPerMember` for everyone.
 * Legs the solo member already submitted stand even if they now exceed that
 * quota — `allMembersFilledQuota` tests `>=`, so the round simply locks once
 * the new member submits theirs, through the ordinary leg-submit path.
 *
 * Only `open` rounds are touched. A locked or settled round no longer consults
 * the flag (both the quota and the manual-lock route require `open`), so its
 * value is left as a record of how the acca was built.
 */
export async function convertSoloRoundsToGroup(
  groupId: string,
  db: DbClient = prisma
): Promise<number> {
  const { count } = await db.round.updateMany({
    where: { groupId, status: "open", unlimitedLegs: true },
    data: { unlimitedLegs: false },
  });
  return count;
}
