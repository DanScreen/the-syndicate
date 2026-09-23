import { auth } from "@/lib/auth";
import { analyticsChannelFromAuthorization } from "@/lib/analytics-channel";
import { verifyMobileToken } from "@/lib/mobile-token";
import { EMAIL_UNVERIFIED_CODE } from "@tiki-acca/shared";
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

type RequireSessionOptions = {
  /**
   * Let unverified accounts through. Only for what the verify-email screen
   * itself needs (status, resend, change email) and account housekeeping
   * (delete account, push unregister, analytics).
   */
  allowUnverified?: boolean;
};

function emailUnverified(): SessionResult {
  return {
    session: null,
    channel: null,
    error: NextResponse.json(
      {
        error: "Please confirm your email address to continue.",
        code: EMAIL_UNVERIFIED_CODE,
      },
      { status: 403 }
    ),
  };
}

export async function requireSession(
  options: RequireSessionOptions = {}
): Promise<SessionResult> {
  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  const channel = analyticsChannelFromAuthorization(authHeader);

  if (channel === "mobile" && authHeader) {
    const token = authHeader.slice(7);
    try {
      const user = await verifyMobileToken(token);
      if (!user.emailVerified && !options.allowUnverified) return emailUnverified();
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
  // `auth()` re-reads verification from the DB on every call (jwt callback),
  // so this is current even when the cookie predates verification.
  if (session.user.isEmailVerified === false && !options.allowUnverified) {
    return emailUnverified();
  }
  return {
    session: session as { user: SessionUser },
    channel,
    error: null,
  };
}
