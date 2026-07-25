import { recordAnalyticsEventAsync } from "@/lib/analytics";
import { consumePasswordResetToken } from "@/lib/password-reset";
import { clientIpFrom, isRateLimited, retryAfterSeconds } from "@/lib/rate-limit";
import { prisma } from "@tiki-acca/database";
import bcrypt from "bcryptjs";
import { resetPasswordSchema } from "@tiki-acca/shared";
import { NextResponse } from "next/server";

const LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const key = `reset-password:${clientIpFrom(request.headers)}`;
    if (isRateLimited(key, LIMIT, WINDOW_MS)) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds(key)) } }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const userId = await consumePasswordResetToken(parsed.data.token);
    if (!userId) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      // Log out every existing device — a leaked reset link shouldn't leave
      // old sessions (possibly the attacker's) still valid.
      prisma.mobileSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    recordAnalyticsEventAsync({ type: "password_reset", userId });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
