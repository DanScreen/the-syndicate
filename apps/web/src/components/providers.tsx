"use client";

import { AuthenticatedPageTracker } from "@/components/analytics/authenticated-page-tracker";
import { EmailVerificationGuard } from "@/components/email-verification-guard";
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthenticatedPageTracker />
      <EmailVerificationGuard />
      {children}
    </SessionProvider>
  );
}
