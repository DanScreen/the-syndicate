import { isDeletedAccountEmail, removeUnverifiedAccount } from "@/lib/account-removal";
import { isAdminEmail, requireAdmin } from "@/lib/admin";
import { emailDomain, emailDomainAcceptsMail } from "@/lib/email-domain";
import { sendVerificationEmail } from "@/lib/email-verification";
import { prisma } from "@tiki-acca/database";
import { adminCorrectEmailSchema } from "@tiki-acca/shared";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

async function findUnverified(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, firstName: true, emailVerifiedAt: true },
  });
  if (!user || isDeletedAccountEmail(user.email)) {
    return { error: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  }
  if (user.emailVerifiedAt) {
    return {
      error: NextResponse.json({ error: "This user has already confirmed their email" }, { status: 409 }),
    };
  }
  return { user };
}

/**
 * Correct a mistyped address (e.g. the user contacted support and can't sign
 * in) and email a fresh link. Sending the current address again = resend.
 * The account stays unverified until the user taps the link.
 */
export async function PATCH(request: Request, { params }: Params) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  const found = await findUnverified(id);
  if (found.error) return found.error;
  const user = found.user;

  const parsed = adminCorrectEmailSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors.email?.[0] ?? "Enter a valid email address" },
      { status: 400 }
    );
  }
  const email = parsed.data.email;

  if (email.toLowerCase() !== user.email.toLowerCase()) {
    if (!(await emailDomainAcceptsMail(emailDomain(email)))) {
      return NextResponse.json(
        { error: "That email domain can't receive mail — check for typos" },
        { status: 400 }
      );
    }
    const taken = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, id: { not: id } },
      select: { id: true },
    });
    if (taken) {
      return NextResponse.json({ error: "That email is already registered" }, { status: 409 });
    }
    await prisma.user.update({
      where: { id },
      // ADMIN_EMAILS is matched on sign-in, so keep role in step with the address.
      data: { email, ...(isAdminEmail(email) ? { role: "admin" } : {}) },
    });
    console.info(`[admin] ${session!.user!.id} changed unverified email for ${id}`);
  }

  const sent = await sendVerificationEmail({ id, email, firstName: user.firstName });
  if (!sent && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Email saved, but the confirmation link couldn't be sent. Try again shortly." },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true, email });
}

/**
 * Remove an account that never confirmed its email, including from every
 * group it joined. See `removeUnverifiedAccount` for delete vs anonymise.
 */
export async function DELETE(_request: Request, { params }: Params) {
  const { session, error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  if (id === session!.user!.id) {
    return NextResponse.json({ error: "You can't remove your own account here" }, { status: 400 });
  }

  const found = await findUnverified(id);
  if (found.error) return found.error;

  const result = await removeUnverifiedAccount(id);
  console.info(`[admin] ${session!.user!.id} removed unverified user ${id} (${result})`);
  return NextResponse.json({ ok: true, result });
}
