import { createHash, randomBytes, randomUUID } from "node:crypto";
import { PrismaClient } from "@tiki-acca/database";
import bcrypt from "bcryptjs";
import { E2E_DATABASE_URL, E2E_PASSWORD } from "./env";

/** Direct DB access for arranging state and minting links the UI would email. */
export const db = new PrismaClient({ datasourceUrl: E2E_DATABASE_URL });

/** Short unique suffix so parallel tests never collide on emails or names. */
export function uniqueId(): string {
  return randomUUID().slice(0, 8);
}

/** tikiacca.com has MX records, so sign-up's deliverability check passes. */
export function uniqueEmail(label: string): string {
  return `e2e-${label.toLowerCase()}-${uniqueId()}@tikiacca.com`;
}

export type SeededUser = {
  id: string;
  email: string;
  password: string;
  firstName: string;
  name: string;
};

let passwordHash: Promise<string> | undefined;

/** A user created directly in the DB — for specs that aren't about sign-up. */
export async function createUser(
  firstName: string,
  options: { verified?: boolean; role?: "user" | "admin"; email?: string } = {}
): Promise<SeededUser> {
  passwordHash ??= bcrypt.hash(E2E_PASSWORD, 10);
  const lastName = "Tester";
  const email = options.email ?? uniqueEmail(firstName);
  const user = await db.user.create({
    data: {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      email,
      passwordHash: await passwordHash,
      role: options.role ?? "user",
      emailVerifiedAt: options.verified === false ? null : new Date(),
      dateOfBirth: new Date("1990-01-01"),
    },
  });
  return { id: user.id, email, password: E2E_PASSWORD, firstName, name: user.name };
}

/**
 * The link a verification email would contain. Tokens are stored hashed, so
 * the one the app emailed can't be read back — mint a fresh one the same way.
 */
export async function mintVerificationPath(email: string, callbackUrl?: string): Promise<string> {
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  const token = randomBytes(32).toString("base64url");
  await db.emailVerificationToken.create({
    data: {
      tokenHash: createHash("sha256").update(token).digest("hex"),
      userId: user.id,
      email,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  const params = new URLSearchParams({ token });
  if (callbackUrl) params.set("callbackUrl", callbackUrl);
  return `/verify-email?${params}`;
}

/**
 * A group with an open bet, arranged directly in the DB — for specs whose
 * subject is what happens inside a group, not how people got there.
 */
export async function createGroupWithMembers(
  owner: SeededUser,
  members: SeededUser[],
  options: { legsPerMember?: number } = {}
): Promise<{ id: string; name: string; inviteCode: string }> {
  const legsPerMember = options.legsPerMember ?? 1;
  const name = `Group ${uniqueId()}`;
  const group = await db.group.create({
    data: {
      name,
      inviteCode: uniqueId().toUpperCase(),
      legsPerMember,
      ownerId: owner.id,
      members: {
        create: [
          { userId: owner.id, role: "owner" },
          ...members.map((m) => ({ userId: m.id })),
        ],
      },
      rounds: {
        create: { status: "open", legsPerMember, betNumber: 1, unlimitedLegs: members.length === 0 },
      },
    },
  });
  return { id: group.id, name, inviteCode: group.inviteCode };
}
