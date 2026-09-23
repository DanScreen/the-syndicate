import { prisma } from "@tiki-acca/database";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { signInSchema } from "@tiki-acca/shared";
import { resolveUserRole } from "@/lib/admin/auth";
import { authConfig } from "@/lib/auth.config";
import { normalizeEmail } from "@/lib/auth-email";
import { recordAnalyticsEventAsync } from "@/lib/analytics";
import { clientIpFrom, isRateLimited } from "@/lib/rate-limit";

/** Sign-in attempts per IP per window — checked before any bcrypt work. */
const SIGN_IN_LIMIT = 10;
const SIGN_IN_WINDOW_MS = 5 * 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.id = user.id;
        token.firstName = user.firstName;
        token.role = user.role ?? "user";
        token.isEmailVerified = user.isEmailVerified;
        return token;
      }

      // Refreshed from the DB on every node-side call so role changes and
      // email verification take effect without re-login.
      const userId = (token.id ?? token.sub) as string | undefined;
      if (userId) {
        const current = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true, email: true, emailVerifiedAt: true },
        });
        if (current) {
          token.role = await resolveUserRole(userId, current.email, current.role);
          token.email = current.email;
          token.isEmailVerified = current.emailVerifiedAt !== null;
        } else {
          token.role = "user";
        }
      }

      return token;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        try {
          // Throttle before schema/DB/bcrypt — bcrypt at cost 10 is the
          // expensive step a flood would exploit.
          const ip = clientIpFrom(request.headers);
          if (isRateLimited(`sign-in:${ip}`, SIGN_IN_LIMIT, SIGN_IN_WINDOW_MS)) {
            return null;
          }

          const parsed = signInSchema.safeParse(credentials);
          if (!parsed.success) return null;

          const email = normalizeEmail(parsed.data.email);
          const user = await prisma.user.findFirst({
            where: { email: { equals: email, mode: "insensitive" } },
          });
          if (!user) return null;

          const valid = await bcrypt.compare(
            parsed.data.password,
            user.passwordHash
          );
          if (!valid) return null;

          const role = await resolveUserRole(user.id, user.email, user.role);
          recordAnalyticsEventAsync({
            type: "login",
            userId: user.id,
            channel: "web",
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            firstName: user.firstName,
            role,
            isEmailVerified: user.emailVerifiedAt !== null,
          };
        } catch (err) {
          console.error("[auth] authorize failed", err);
          return null;
        }
      },
    }),
  ],
});
