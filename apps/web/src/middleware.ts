import NextAuth from "next-auth";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { withoutSessionCookie } from "@/lib/session-cookie";

/**
 * Origin bypass protection: when ORIGIN_AUTH_SECRET is set, only requests
 * carrying the matching x-origin-auth header (added by a Cloudflare Transform
 * Rule) are served. This stops attackers hitting the public *.run.app URL
 * directly and skipping Cloudflare's DDoS absorption entirely.
 *
 * Exempt: /api/health (uptime checks) and /api/internal/* — Cloud Scheduler
 * calls the run.app URL directly and those routes carry their own
 * CRON_SECRET bearer auth.
 *
 * Unset ORIGIN_AUTH_SECRET (local dev) disables the check.
 */
const authMiddleware = NextAuth(authConfig).auth((req) => {
  const secret = process.env.ORIGIN_AUTH_SECRET;
  if (!secret) return;

  const path = req.nextUrl.pathname;
  if (path === "/api/health" || path.startsWith("/api/internal/")) return;

  if (req.headers.get("x-origin-auth") !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
});

// Auth.js re-sends the request's (possibly stale) session cookie on every
// middleware response; see withoutSessionCookie for why that's dropped.
export default async function middleware(req: NextRequest, ev: NextFetchEvent) {
  // Typed as a route handler; as middleware it always resolves to a Response.
  const response = (await authMiddleware(req, ev as never)) as Response;
  return withoutSessionCookie(response);
}

export const config = {
  // Everything except Next.js static assets — the origin check must cover
  // all pages and API routes. Auth gating for protected paths lives in
  // authConfig's `authorized` callback, unchanged.
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
