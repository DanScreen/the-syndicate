"use client";

import { AppHeader } from "@/components/header";
import { greetingFirstName } from "@/lib/user-display";
import { useSession } from "next-auth/react";
import { MarketingHeader } from "./marketing-header";

/**
 * Client header so statically generated marketing pages (e.g. `/blog`) still
 * show the signed-in chrome. Server `auth()` at build time is always null.
 */
export function SessionAwareMarketingHeader() {
  const { data: session, status } = useSession();

  if (status === "authenticated" && session?.user) {
    return <AppHeader userName={greetingFirstName(session.user)} />;
  }

  return <MarketingHeader />;
}
