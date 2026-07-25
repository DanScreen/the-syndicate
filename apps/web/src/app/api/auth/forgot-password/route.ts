import { normalizeEmail } from "@/lib/auth-email";
import { resetPasswordEmail } from "@/lib/auth-email-templates";
import { sendEmail } from "@/lib/notifications/email";
import { appBaseUrl } from "@/lib/notifications/email-layout";
import { createPasswordResetToken } from "@/lib/password-reset";
import { clientIpFrom, isRateLimited, retryAfterSeconds } from "@/lib/rate-limit";
import { prisma } from "@tiki-acca/database";
import { forgotPasswordSchema } from "@tiki-acca/shared";
import { NextResponse } from "next/server";

const IP_LIMIT = 10;
const IP_WINDOW_MS = 60 * 60 * 1000;
const EMAIL_LIMIT = 3;
const EMAIL_WINDOW_MS = 60 * 60 * 1000;

// Always the same shape, whether or not the email is registered — the
// endpoint must not reveal account existence.
function genericResponse() {
  return NextResponse.json({
    message: "If that email is registered, we've sent a password reset link.",
  });
}

export async function POST(request: Request) {
  try {
    const ipKey = `forgot-password:${clientIpFrom(request.headers)}`;
    if (isRateLimited(ipKey, IP_LIMIT, IP_WINDOW_MS)) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds(ipKey)) } }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const email = normalizeEmail(parsed.data.email);
    const emailKey = `forgot-password-email:${email}`;
    if (isRateLimited(emailKey, EMAIL_LIMIT, EMAIL_WINDOW_MS)) {
      return genericResponse();
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    if (user) {
      const token = await createPasswordResetToken(user.id);
      const resetUrl = `${appBaseUrl()}/reset-password?token=${token}`;
      const doc = resetPasswordEmail({ resetUrl });
      await sendEmail({ to: [user.email], subject: doc.subject, html: doc.html, text: doc.text });
    }

    return genericResponse();
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
