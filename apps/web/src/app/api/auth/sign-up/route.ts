import { isAdminEmail } from "@/lib/admin";
import { normalizeEmail } from "@/lib/auth-email";
import { recordAnalyticsEventAsync } from "@/lib/analytics";
import { prisma } from "@the-syndicate/database";
import bcrypt from "bcryptjs";
import { signUpSchema } from "@the-syndicate/shared";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
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

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const role = isAdminEmail(email) ? "admin" : "user";
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        passwordHash,
        role,
      },
      select: { id: true, name: true, email: true },
    });

    recordAnalyticsEventAsync({ type: "sign_up", userId: user.id });

    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
