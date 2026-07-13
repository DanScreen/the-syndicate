import { createMobileToken } from "@/lib/mobile-token";
import { resolveUserRole } from "@/lib/admin";
import { normalizeEmail } from "@/lib/auth-email";
import { recordAnalyticsEventAsync } from "@/lib/analytics";
import { clientIpFrom, isRateLimited, retryAfterSeconds } from "@/lib/rate-limit";
import { prisma } from "@the-syndicate/database";
import bcrypt from "bcryptjs";
import { signInSchema } from "@the-syndicate/shared";
import { NextResponse } from "next/server";

const SIGN_IN_LIMIT = 10;
const SIGN_IN_WINDOW_MS = 5 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const key = `mobile-sign-in:${clientIpFrom(request.headers)}`;
    if (isRateLimited(key, SIGN_IN_LIMIT, SIGN_IN_WINDOW_MS)) {
      return NextResponse.json(
        { error: "Too many sign-in attempts — try again shortly" },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds(key)) } }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = signInSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const email = normalizeEmail(parsed.data.email);
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await resolveUserRole(user.id, user.email, user.role);
    recordAnalyticsEventAsync({ type: "login", userId: user.id });

    const token = await createMobileToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    return NextResponse.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
