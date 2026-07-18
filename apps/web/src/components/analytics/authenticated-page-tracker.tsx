"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function AuthenticatedPageTracker() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const lastEventKey = useRef<string | null>(null);

  useEffect(() => {
    const userId = session?.user?.id;
    if (status !== "authenticated" || !userId) {
      lastEventKey.current = null;
      return;
    }
    if (!pathname) return;

    const eventKey = `${userId}:${pathname}`;
    if (lastEventKey.current === eventKey) return;
    lastEventKey.current = eventKey;

    void fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "page_view", path: pathname }),
      keepalive: true,
    }).catch(() => {
      // Analytics must never interrupt navigation.
    });
  }, [pathname, session?.user?.id, status]);

  return null;
}
