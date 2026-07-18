import { auth } from "@/lib/auth";
import { analyticsChannelFromAuthorization } from "@/lib/analytics-channel";
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
  channel: "web" | "mobile" | null;
  error: NextResponse | null;
};

export async function requireSession(): Promise<SessionResult> {
  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  const channel = analyticsChannelFromAuthorization(authHeader);

  if (channel === "mobile" && authHeader) {
    const token = authHeader.slice(7);
    try {
      const user = await verifyMobileToken(token);
      return { session: { user }, channel, error: null };
    } catch {
      return {
        session: null,
        channel: null,
        error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }
  }

  const session = await auth();
  if (!session?.user?.id) {
    return {
      session: null,
      channel: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return {
    session: session as { user: SessionUser },
    channel,
    error: null,
  };
}
