import { requireSession } from "@/lib/api-auth";
import { prisma } from "@tiki-acca/database";
import { confirmDateOfBirthSchema } from "@tiki-acca/shared";
import { NextResponse } from "next/server";

/** `YYYY-MM-DD` for a stored DATE column, timezone-free. */
function toCalendarString(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

/** Current age-verification state for the signed-in account. */
export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const user = await prisma.user.findUnique({
    where: { id: session!.user!.id },
    select: { dateOfBirth: true },
  });

  return NextResponse.json({
    dateOfBirth: toCalendarString(user?.dateOfBirth ?? null),
  });
}

/**
 * Confirm the date of birth for an account that has none on file — accounts
 * created before date-of-birth capture. The 18+ gate is enforced server-side by
 * `confirmDateOfBirthSchema`, exactly as at sign-up. A DOB already on file is
 * never overwritten here: age is set once and is not self-service editable.
 */
export async function PATCH(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const userId = session!.user!.id;

  const body = await request.json().catch(() => null);
  const parsed = confirmDateOfBirthSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.flatten().fieldErrors.dateOfBirth?.[0] ??
          "Enter a valid date of birth",
      },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { dateOfBirth: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
  if (existing.dateOfBirth) {
    return NextResponse.json(
      {
        error:
          "Your date of birth is already on file. Contact support if it needs correcting.",
        dateOfBirth: toCalendarString(existing.dateOfBirth),
      },
      { status: 409 }
    );
  }

  // Stored as UTC midnight in a DATE column, matching the sign-up route.
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { dateOfBirth: new Date(`${parsed.data.dateOfBirth}T00:00:00.000Z`) },
    select: { dateOfBirth: true },
  });

  return NextResponse.json({
    dateOfBirth: toCalendarString(updated.dateOfBirth),
  });
}
