"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppNav() {
  const pathname = usePathname();
  const groupsActive =
    pathname === "/dashboard" ||
    pathname === "/groups/create" ||
    pathname === "/groups/join" ||
    pathname.startsWith("/groups/");
  const performanceActive = pathname === "/performance";

  return (
    <nav className="flex items-center gap-1">
      <Link
        href="/dashboard"
        className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
          groupsActive
            ? "bg-accent-muted/40 text-accent"
            : "text-muted hover:text-foreground"
        }`}
      >
        Groups
      </Link>
      <Link
        href="/performance"
        className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
          performanceActive
            ? "bg-accent-muted/40 text-accent"
            : "text-muted hover:text-foreground"
        }`}
      >
        Performance
      </Link>
    </nav>
  );
}
