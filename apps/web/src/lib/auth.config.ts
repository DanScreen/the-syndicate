import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";
import { isProtectedPath, signInHref, verifyEmailHref } from "@/lib/auth-paths";

/**
 * Edge-safe Auth.js config — no Prisma or Node-only imports.
 * Used by middleware; extended in auth.ts for credentials sign-in.
 */
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/sign-in",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const path = request.nextUrl.pathname;
      // Invite links must be viewable signed-out so we can prompt sign-in/up
      // while preserving `?code=` (see `/groups/join`).
      if (!isProtectedPath(path)) return true;
      const returnTo = `${path}${request.nextUrl.search}`;
      // Redirect explicitly rather than returning false: middleware wraps its
      // own handler (the origin check), and Auth.js skips its default sign-in
      // redirect whenever a handler is passed.
      if (!isLoggedIn) {
        return NextResponse.redirect(new URL(signInHref(returnTo), request.nextUrl));
      }
      // Edge can't reach the DB, so this reads the cookie's copy. The node-side
      // jwt callback refreshes it; API routes re-check against the DB.
      if (auth?.user?.isEmailVerified === false) {
        return NextResponse.redirect(new URL(verifyEmailHref(returnTo), request.nextUrl));
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.id = user.id;
        token.firstName = user.firstName;
        token.role = user.role ?? "user";
        token.isEmailVerified = user.isEmailVerified;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const id = (token.id ?? token.sub) as string | undefined;
        if (id) session.user.id = id;
        if (typeof token.firstName === "string") {
          session.user.firstName = token.firstName;
        }
        session.user.role = (token.role as "user" | "admin") ?? "user";
        if (typeof token.isEmailVerified === "boolean") {
          session.user.isEmailVerified = token.isEmailVerified;
        }
        if (typeof token.email === "string") session.user.email = token.email;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const target = new URL(url);
        const base = new URL(baseUrl);
        if (target.origin === base.origin) return url;
      } catch {
        /* ignore */
      }
      return `${baseUrl}/dashboard`;
    },
  },
} satisfies NextAuthConfig;
