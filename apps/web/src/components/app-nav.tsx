"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

export function AppNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const groupsActive =
    pathname === "/dashboard" ||
    pathname === "/groups/create" ||
    pathname === "/groups/join" ||
    pathname.startsWith("/groups/");
  const performanceActive = pathname === "/performance";
  const adminActive = pathname.startsWith("/admin");

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
      {isAdmin && (
        <Link
          href="/admin"
          className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
            adminActive
              ? "bg-accent-muted/40 text-accent"
              : "text-muted hover:text-foreground"
          }`}
        >
          Admin
        </Link>
      )}
    </nav>
  );
}
