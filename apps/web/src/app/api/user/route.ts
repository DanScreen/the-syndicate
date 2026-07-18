import { requireSession } from "@/lib/api-auth";
import { prisma } from "@tiki-acca/database";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const user = await prisma.user.findUnique({
    where: { id: session!.user!.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      name: true,
      email: true,
      totalPoints: true,
      legsWon: true,
      legsLost: true,
      memberships: {
        include: {
          group: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json({ user });
}

const deleteAccountSchema = z.object({ password: z.string().min(1) });

/**
 * Delete the account (App Review 5.1.1(v)). Personal data is anonymised and all
 * device access revoked; the user row itself is kept as a tombstone so other
 * members' group history, legs, and chat stay intact ("Former member").
 * Sole-owned groups pass to the longest-standing other member, or are deleted
 * when the leaver is the only member.
 */
export async function DELETE(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const userId = session!.user!.id;

  const parsed = deleteAccountSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
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
        // Cascades members, rounds, legs, and messages.
        await tx.group.delete({ where: { id: group.id } });
      }
    }

    await tx.mobileSession.deleteMany({ where: { userId } });
    await tx.pushDevice.deleteMany({ where: { userId } });
    await tx.notificationPreference.deleteMany({ where: { userId } });

    await tx.user.update({
      where: { id: userId },
      data: {
        firstName: "Former",
        lastName: "Member",
        name: "Former member",
        email: `deleted-${userId}@removed.tikiacca.com`,
        passwordHash: `deleted:${randomBytes(32).toString("hex")}`,
        dateOfBirth: null,
        role: "user",
      },
    });
  });

  return NextResponse.json({ ok: true });
}
