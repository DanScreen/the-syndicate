import { SignJWT, jwtVerify } from "jose";

const secret = () =>
  new TextEncoder().encode(
    process.env.AUTH_SECRET ?? "dev-secret-change-in-production-the-syndicate-2026"
  );

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
    .sign(secret());
}

export async function verifyMobileToken(token: string): Promise<MobileUser> {
  const { payload } = await jwtVerify(token, secret());
  if (!payload.id || !payload.email || !payload.name) {
    throw new Error("Invalid token payload");
  }
  return {
    id: payload.id as string,
    email: payload.email as string,
    name: payload.name as string,
  };
}
