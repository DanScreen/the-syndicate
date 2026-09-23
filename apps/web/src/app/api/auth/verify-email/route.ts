import { recordAnalyticsEventAsync } from "@/lib/analytics";
import { consumeEmailVerificationToken } from "@/lib/email-verification";
import { clientIpFrom, isRateLimited, retryAfterSeconds } from "@/lib/rate-limit";
import { verifyEmailSchema } from "@tiki-acca/shared";
import { NextResponse } from "next/server";

const LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000;

/**
 * Public: the emailed link may be opened signed-out or on another device.
 * POST (called by the /verify-email page) rather than GET so mail-scanner
 * prefetches of the link can't consume it.
 */
export async function POST(request: Request) {
  try {
    const key = `verify-email:${clientIpFrom(request.headers)}`;
    if (isRateLimited(key, LIMIT, WINDOW_MS)) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds(key)) } }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = verifyEmailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const userId = await consumeEmailVerificationToken(parsed.data.token);
    if (!userId) {
      return NextResponse.json(
        { error: "This link is invalid or has expired." },
        { status: 400 }
      );
    }

    recordAnalyticsEventAsync({ type: "email_verified", userId });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
