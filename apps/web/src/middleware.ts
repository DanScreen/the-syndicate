import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

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
export default NextAuth(authConfig).auth((req) => {
  const secret = process.env.ORIGIN_AUTH_SECRET;
  if (!secret) return;

  const path = req.nextUrl.pathname;
  if (path === "/api/health" || path.startsWith("/api/internal/")) return;

  if (req.headers.get("x-origin-auth") !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
});

export const config = {
  // Everything except Next.js static assets — the origin check must cover
  // all pages and API routes. Auth gating for protected paths lives in
  // authConfig's `authorized` callback, unchanged.
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
