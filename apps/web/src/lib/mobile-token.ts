import { prisma } from "@tiki-acca/database";
import { createHash, randomBytes } from "node:crypto";
import { jwtVerify } from "jose";

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET is required in production");
    }
    return new TextEncoder().encode(
      "dev-secret-change-in-production-tiki-acca-2026"
    );
  }
  return new TextEncoder().encode(secret);
}

export type MobileUser = {
  id: string;
  email: string;
  name: string;
};

const SESSION_PREFIX = "ms_";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createMobileToken(user: MobileUser): Promise<string> {
  const token = `${SESSION_PREFIX}${randomBytes(32).toString("base64url")}`;
  await prisma.mobileSession.create({
    data: {
      tokenHash: hashToken(token),
      userId: user.id,
    },
  });
  return token;
}

export async function verifyMobileToken(token: string): Promise<MobileUser> {
  if (token.startsWith(SESSION_PREFIX)) {
    const session = await prisma.mobileSession.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });
    if (!session || session.revokedAt) {
      throw new Error("Invalid mobile session");
    }

    // Keep an inexpensive audit timestamp without writing on every API call.
    if (Date.now() - session.lastUsedAt.getTime() > 24 * 60 * 60 * 1000) {
      await prisma.mobileSession.update({
        where: { id: session.id },
        data: { lastUsedAt: new Date() },
      });
    }
    return session.user;
  }

  // Existing 30-day JWTs remain valid during rollout. New sign-ins use
  // revocable persistent sessions above.
  const { payload } = await jwtVerify(token, getAuthSecret());
  if (!payload.id || !payload.email || !payload.name) {
    throw new Error("Invalid token payload");
  }
  return {
    id: payload.id as string,
    email: payload.email as string,
    name: payload.name as string,
  };
}

export async function revokeMobileToken(token: string): Promise<void> {
  if (!token.startsWith(SESSION_PREFIX)) return;
  await prisma.mobileSession.updateMany({
    where: {
      tokenHash: hashToken(token),
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}
