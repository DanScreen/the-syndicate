"use client";

import { AuthenticatedPageTracker } from "@/components/analytics/authenticated-page-tracker";
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthenticatedPageTracker />
      {children}
    </SessionProvider>
  );
}
