import { requireSession } from "@/lib/api-auth";
import { prisma } from "@tiki-acca/database";
import type { EmailVerificationStatus } from "@tiki-acca/shared";
import { NextResponse } from "next/server";

/** Lets the verify screen (web + mobile) notice a link clicked elsewhere. */
export async function GET() {
  const { session, error } = await requireSession({ allowUnverified: true });
  if (error) return error;

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { email: true, emailVerifiedAt: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status: EmailVerificationStatus = {
    email: user.email,
    emailVerified: user.emailVerifiedAt !== null,
  };
  return NextResponse.json(status);
}
