import { prisma } from "@the-syndicate/database";
import type { UserRole } from "@the-syndicate/shared";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireSession } from "@/lib/api-auth";

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string): boolean {
  return getAdminEmails().includes(email.trim().toLowerCase());
}

/** Promote env-listed emails to admin; returns effective role. */
export async function resolveUserRole(
  userId: string,
  email: string,
  currentRole: string
): Promise<UserRole> {
  try {
    if (isAdminEmail(email)) {
      if (currentRole !== "admin") {
        await prisma.user.update({
          where: { id: userId },
          data: { role: "admin" },
        });
      }
      return "admin";
    }
    return currentRole === "admin" ? "admin" : "user";
  } catch (err) {
    console.error("[admin] resolveUserRole failed", err);
    return currentRole === "admin" ? "admin" : "user";
  }
}

export async function requireAdmin() {
  const bearer = await headers().then((h) => h.get("authorization"));
  if (bearer?.startsWith("Bearer ")) {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const { session, error } = await requireSession();
  if (error) return { session: null, error };

  const user = await prisma.user.findUnique({
    where: { id: session!.user!.id },
    select: { id: true, role: true, email: true },
  });

  if (!user || user.role !== "admin") {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { session, user, error: null };
}

export async function getSessionUserRole(userId: string): Promise<UserRole> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, email: true },
  });
  if (!user) return "user";
  return resolveUserRole(userId, user.email, user.role);
}

export async function requireAdminPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return { session: null, redirect: "/sign-in" as const };
  }

  const role = await getSessionUserRole(session.user.id);
  if (role !== "admin") {
    return { session: null, redirect: "/dashboard" as const };
  }

  return { session: { ...session, user: { ...session.user, role } }, redirect: null };
}
