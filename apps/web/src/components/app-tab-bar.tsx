"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type TabIconName = "team" | "performance" | "account";

/** Mirrors the native app's bottom tabs (apps/mobile app-tab-bar.tsx). */
const TABS: {
  href: string;
  label: string;
  icon: TabIconName;
  match: (pathname: string) => boolean;
}[] = [
  {
    href: "/dashboard",
    label: "Groups",
    icon: "team",
    match: (p) =>
      p === "/dashboard" || p.startsWith("/groups/") || p === "/groups",
  },
  {
    href: "/performance",
    label: "Performance",
    icon: "performance",
    match: (p) => p === "/performance",
  },
  {
    href: "/account",
    label: "Account",
    icon: "account",
    match: (p) => p === "/account" || p.startsWith("/settings"),
  },
];

function TabIcon({ name }: { name: TabIconName }) {
  const paths: Record<TabIconName, string> = {
    team: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    performance: "M4 3v17h17M7 16l4-5 3 3 6-8",
    account: "M12 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5 21c.7-4.2 3-6.3 7-6.3s6.3 2.1 7 6.3",
  };
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={paths[name]} />
    </svg>
  );
}

/**
 * Persistent bottom tab bar for authenticated pages below `md` — matches the
 * native app's mental model. The hamburger keeps the secondary links
 * (Home/About/Blog/Admin). Content clearance comes from a body padding rule in
 * globals.css keyed off data-app-tab-bar.
 */
export function AppTabBar() {
  const pathname = usePathname();

  return (
    <nav
      data-app-tab-bar
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 flex border-t border-border bg-card/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-xs font-semibold transition-colors ${
              active ? "text-accent" : "text-muted hover:text-foreground"
            }`}
          >
            <TabIcon name={tab.icon} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
