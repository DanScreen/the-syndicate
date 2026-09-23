import { verifyEmailEmail } from "@/lib/auth-email-templates";
import { sendEmail } from "@/lib/notifications/email";
import { appBaseUrl } from "@/lib/notifications/email-layout";
import { prisma } from "@tiki-acca/database";
import { createHash, randomBytes } from "node:crypto";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Emails a fresh verification link to the user's current address. Earlier
 * unexpired links stay valid, so a resend never breaks a link already in the
 * inbox. Returns whether the email was handed to the provider.
 */
export async function sendVerificationEmail(user: {
  id: string;
  email: string;
  firstName: string;
}): Promise<boolean> {
  const token = randomBytes(32).toString("base64url");
  await prisma.emailVerificationToken.create({
    data: {
      tokenHash: hashToken(token),
      userId: user.id,
      email: user.email,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  const verifyUrl = `${appBaseUrl()}/verify-email?token=${token}`;
  const doc = verifyEmailEmail({ verifyUrl, firstName: user.firstName });
  const sent = await sendEmail({
    to: [user.email],
    subject: doc.subject,
    html: doc.html,
    text: doc.text,
  });

  if (!sent && process.env.NODE_ENV !== "production") {
    // No RESEND_API_KEY locally — without this there'd be no way past the gate.
    console.info(`[email-verification] ${user.email}: ${verifyUrl}`);
  }
  return sent;
}

/** Whether an unused, unexpired link for the user's current address exists. */
export async function hasPendingVerificationEmail(user: {
  id: string;
  email: string;
}): Promise<boolean> {
  const pending = await prisma.emailVerificationToken.findFirst({
    where: {
      userId: user.id,
      email: user.email,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
  return pending !== null;
}

/**
 * Validates and consumes a verification token, marking the user verified.
 * The token only counts if it was issued for the user's current address.
 * Returns the user id, or null for an unknown/expired/used/stale link.
 */
export async function consumeEmailVerificationToken(token: string): Promise<string | null> {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { email: true, emailVerifiedAt: true } } },
  });
  if (!record || record.expiresAt < new Date()) return null;
  if (record.user.email.toLowerCase() !== record.email.toLowerCase()) return null;

  // Re-opening a used link (mail client preview, second tap) is harmless once
  // the account is verified — report success rather than a scary error.
  if (record.usedAt) {
    return record.user.emailVerifiedAt ? record.userId : null;
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: now },
    }),
    prisma.user.updateMany({
      where: { id: record.userId, emailVerifiedAt: null },
      data: { emailVerifiedAt: now },
    }),
  ]);
  return record.userId;
}
