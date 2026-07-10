import type { NextAuthConfig } from "next-auth";

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
      const isProtected =
        path.startsWith("/dashboard") ||
        path.startsWith("/groups") ||
        path.startsWith("/admin") ||
        path === "/performance";
      if (isProtected) return isLoggedIn;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.id = user.id;
        token.role = user.role ?? "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const id = (token.id ?? token.sub) as string | undefined;
        if (id) session.user.id = id;
        session.user.role = (token.role as "user" | "admin") ?? "user";
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
