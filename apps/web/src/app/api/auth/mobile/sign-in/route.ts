import { createMobileToken } from "@/lib/mobile-token";
import { resolveUserRole } from "@/lib/admin";
import { recordAnalyticsEventAsync } from "@/lib/analytics";
import { prisma } from "@the-syndicate/database";
import bcrypt from "bcryptjs";
import { signInSchema } from "@the-syndicate/shared";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signInSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await resolveUserRole(user.id, user.email, user.role);
    recordAnalyticsEventAsync({ type: "login", userId: user.id });

    const token = await createMobileToken({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    return NextResponse.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
