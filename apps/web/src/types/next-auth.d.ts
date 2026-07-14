import type { DefaultSession } from "next-auth";
import type { UserRole } from "@tiki-acca/shared";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      firstName?: string;
      role?: UserRole;
    };
  }

  interface User {
    firstName?: string;
    role?: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    firstName?: string;
    role?: UserRole;
  }
}
