import { requireSession } from "@/lib/api-auth";
import { isAdminEmail } from "@/lib/admin";
import { emailDomain, emailDomainAcceptsMail } from "@/lib/email-domain";
import { sendVerificationEmail } from "@/lib/email-verification";
import { isRateLimited, retryAfterSeconds } from "@/lib/rate-limit";
import { prisma } from "@tiki-acca/database";
import bcrypt from "bcryptjs";
import { changeUnverifiedEmailSchema } from "@tiki-acca/shared";
import { NextResponse } from "next/server";

const LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;

function fieldError(field: "email" | "password", message: string, status = 400) {
  return NextResponse.json(
    { error: { formErrors: [], fieldErrors: { [field]: [message] } } },
    { status }
  );
}

/**
 * Fix a mistyped sign-up address. Unverified accounts only — once verified,
 * changing email is an account-security change this flow doesn't cover.
 * Password is required so a borrowed signed-in session can't take the account.
 */
export async function POST(request: Request) {
  const { session, error } = await requireSession({ allowUnverified: true });
  if (error) return error;
  const userId = session!.user.id;

  const key = `verify-email-change:${userId}`;
  if (isRateLimited(key, LIMIT, WINDOW_MS)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds(key)) } }
    );
  }

  const parsed = changeUnverifiedEmailSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, firstName: true, passwordHash: true, emailVerifiedAt: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.emailVerifiedAt) {
    return NextResponse.json(
      { error: "Your email is already confirmed." },
      { status: 409 }
    );
  }
  if (!(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return fieldError("password", "Incorrect password", 403);
  }

  const email = parsed.data.email;
  if (!(await emailDomainAcceptsMail(emailDomain(email)))) {
    return fieldError("email", "That email domain can't receive mail — check for typos");
  }

  const taken = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, id: { not: userId } },
    select: { id: true },
  });
  if (taken) {
    return fieldError("email", "That email is already registered", 409);
  }

  await prisma.user.update({
    where: { id: userId },
    // ADMIN_EMAILS is matched on sign-in, so keep role in step with the address.
    data: { email, ...(isAdminEmail(email) ? { role: "admin" } : {}) },
  });

  await sendVerificationEmail({ id: userId, email, firstName: user.firstName }).catch((err) => {
    console.error("[change-email] verification email failed", err);
  });

  return NextResponse.json({ ok: true, email });
}
