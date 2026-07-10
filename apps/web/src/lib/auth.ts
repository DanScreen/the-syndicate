import { prisma } from "@the-syndicate/database";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { signInSchema } from "@the-syndicate/shared";
import { resolveUserRole } from "@/lib/admin";
import { authConfig } from "@/lib/auth.config";
import { normalizeEmail } from "@/lib/auth-email";
import { recordAnalyticsEventAsync } from "@/lib/analytics";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
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
          recordAnalyticsEventAsync({ type: "login", userId: user.id });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role,
          };
        } catch (err) {
          console.error("[auth] authorize failed", err);
          return null;
        }
      },
    }),
  ],
});
