import { SignJWT, jwtVerify } from "jose";

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

export async function createMobileToken(user: MobileUser): Promise<string> {
  return new SignJWT({ id: user.id, email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getAuthSecret());
}

export async function verifyMobileToken(token: string): Promise<MobileUser> {
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
