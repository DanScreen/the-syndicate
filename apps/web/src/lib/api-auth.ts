import { auth } from "@/lib/auth";
import { verifyMobileToken } from "@/lib/mobile-token";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

type SessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
};

type SessionResult = {
  session: { user: SessionUser } | null;
  error: NextResponse | null;
};

export async function requireSession(): Promise<SessionResult> {
  const headersList = await headers();
  const authHeader = headersList.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const user = await verifyMobileToken(token);
      return { session: { user }, error: null };
    } catch {
      return {
        session: null,
        error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }
  }

  const session = await auth();
  if (!session?.user?.id) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session: session as { user: SessionUser }, error: null };
}
