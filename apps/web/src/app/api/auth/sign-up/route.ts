import { isAdminEmail } from "@/lib/admin";
import { normalizeEmail } from "@/lib/auth-email";
import { recordAnalyticsEventAsync } from "@/lib/analytics";
import { clientIpFrom, isRateLimited, retryAfterSeconds } from "@/lib/rate-limit";
import { prisma } from "@tiki-acca/database";
import bcrypt from "bcryptjs";
import { formatDisplayName, signUpSchema } from "@tiki-acca/shared";
import { NextResponse } from "next/server";

const SIGN_UP_LIMIT = 5;
const SIGN_UP_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const key = `sign-up:${clientIpFrom(request.headers)}`;
    if (isRateLimited(key, SIGN_UP_LIMIT, SIGN_UP_WINDOW_MS)) {
      return NextResponse.json(
        { error: "Too many sign-up attempts — try again later" },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds(key)) } }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = signUpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const email = normalizeEmail(parsed.data.email);
    const existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const firstName = parsed.data.firstName.trim();
    const lastName = parsed.data.lastName.trim();
    const name = formatDisplayName(firstName, lastName);
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const role = isAdminEmail(email) ? "admin" : "user";
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        name,
        email,
        passwordHash,
        role,
      },
      select: { id: true, firstName: true, lastName: true, name: true, email: true },
    });

    recordAnalyticsEventAsync({ type: "sign_up", userId: user.id });

    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
