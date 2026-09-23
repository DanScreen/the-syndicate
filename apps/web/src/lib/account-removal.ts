import { Prisma, prisma } from "@tiki-acca/database";
import { randomBytes } from "node:crypto";

/** Deleted accounts keep a tombstone row with an address on this domain. */
export const DELETED_EMAIL_DOMAIN = "removed.tikiacca.com";

export function isDeletedAccountEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${DELETED_EMAIL_DOMAIN}`);
}

/**
 * Sole-owned groups pass to the longest-standing other member, or are deleted
 * (cascading members, rounds, legs, and messages) when the user is alone.
 */
async function handOverOwnedGroups(tx: Prisma.TransactionClient, userId: string) {
  const owned = await tx.group.findMany({
    where: { ownerId: userId },
    select: {
      id: true,
      members: {
        where: { userId: { not: userId } },
        orderBy: { joinedAt: "asc" },
        take: 1,
        select: { id: true, userId: true },
      },
    },
  });
  for (const group of owned) {
    const heir = group.members[0];
    if (heir) {
      await tx.group.update({
        where: { id: group.id },
        data: { ownerId: heir.userId },
      });
      await tx.groupMember.update({
        where: { id: heir.id },
        data: { role: "owner" },
      });
    } else {
      await tx.group.delete({ where: { id: group.id } });
    }
  }
}

/**
 * Personal data is anonymised and all device access revoked; the user row is
 * kept as a tombstone so other members' group history, legs, and chat stay
 * intact ("Former member").
 */
export async function anonymiseAccount(tx: Prisma.TransactionClient, userId: string) {
  await handOverOwnedGroups(tx, userId);

  await tx.mobileSession.deleteMany({ where: { userId } });
  await tx.pushDevice.deleteMany({ where: { userId } });
  await tx.notificationPreference.deleteMany({ where: { userId } });
  await tx.emailVerificationToken.deleteMany({ where: { userId } });
  await tx.passwordResetToken.deleteMany({ where: { userId } });

  await tx.user.update({
    where: { id: userId },
    data: {
      firstName: "Former",
      lastName: "Member",
      name: "Former member",
      email: `deleted-${userId}@${DELETED_EMAIL_DOMAIN}`,
      emailVerifiedAt: null,
      passwordHash: `deleted:${randomBytes(32).toString("hex")}`,
      dateOfBirth: null,
      role: "user",
    },
  });
}

export type UnverifiedRemovalResult = "deleted" | "anonymised";

/**
 * Admin removal of an account that never confirmed its email. Accounts with no
 * legs or chat messages are deleted outright; otherwise the account is
 * anonymised like a self-delete so group history survives. Either way the user
 * leaves every group, so they stop counting towards round quotas.
 */
export async function removeUnverifiedAccount(
  userId: string
): Promise<UnverifiedRemovalResult> {
  return prisma.$transaction(async (tx) => {
    const [legs, messages] = await Promise.all([
      tx.leg.count({ where: { userId } }),
      tx.roundMessage.count({ where: { userId } }),
    ]);

    await handOverOwnedGroups(tx, userId);

    if (legs === 0 && messages === 0) {
      // Everything else referencing the user cascades or is set null.
      await tx.user.delete({ where: { id: userId } });
      return "deleted";
    }

    await anonymiseAccount(tx, userId);
    await tx.groupMember.deleteMany({ where: { userId } });
    return "anonymised";
  });
}
