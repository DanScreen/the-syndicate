import { requireSession } from "@/lib/api-auth";
import {
  hasPendingVerificationEmail,
  sendVerificationEmail,
} from "@/lib/email-verification";
import { isRateLimited, retryAfterSeconds } from "@/lib/rate-limit";
import { prisma } from "@tiki-acca/database";
import { NextResponse } from "next/server";

const LIMIT = 3;
const WINDOW_MS = 60 * 60 * 1000;

/**
 * Body `{ onlyIfNonePending: true }` is sent automatically when the verify
 * screen opens: accounts that predate verification have never been emailed,
 * while fresh sign-ups already have a link in their inbox.
 */
export async function POST(request: Request) {
  const { session, error } = await requireSession({ allowUnverified: true });
  if (error) return error;

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { id: true, email: true, firstName: true, emailVerifiedAt: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.emailVerifiedAt) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const body = await request.json().catch(() => null);
  if (body?.onlyIfNonePending === true && (await hasPendingVerificationEmail(user))) {
    return NextResponse.json({ ok: true, email: user.email, alreadySent: true });
  }

  const key = `verify-email-resend:${user.id}`;
  if (isRateLimited(key, LIMIT, WINDOW_MS)) {
    return NextResponse.json(
      { error: "We've sent a few already — check your spam folder, or try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds(key)) } }
    );
  }

  const sent = await sendVerificationEmail(user);
  if (!sent && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "We couldn't send the email just now. Try again shortly." },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true, email: user.email });
}
