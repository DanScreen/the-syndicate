"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

function navLinkClass(active: boolean) {
  return `rounded-lg px-3 py-1.5 text-sm transition-colors ${
    active
      ? "bg-accent-muted/40 text-accent"
      : "text-muted hover:text-foreground"
  }`;
}

export function AppNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const homeActive = pathname === "/";
  const aboutActive = pathname === "/about";
  const blogActive = pathname === "/blog" || pathname.startsWith("/blog/");
  const groupsActive =
    pathname === "/dashboard" ||
    pathname === "/groups/create" ||
    pathname === "/groups/join" ||
    pathname.startsWith("/groups/");
  const performanceActive = pathname === "/performance";
  const adminActive = pathname.startsWith("/admin");

  return (
    <nav className="flex flex-wrap items-center gap-1">
      <Link href="/" className={navLinkClass(homeActive)}>
        Home
      </Link>
      <Link href="/about" className={navLinkClass(aboutActive)}>
        About
      </Link>
      <Link href="/blog" className={navLinkClass(blogActive)}>
        Blog
      </Link>
      <Link href="/dashboard" className={navLinkClass(groupsActive)}>
        Groups
      </Link>
      <Link href="/performance" className={navLinkClass(performanceActive)}>
        Performance
      </Link>
      {isAdmin && (
        <Link href="/admin" className={navLinkClass(adminActive)}>
          Admin
        </Link>
      )}
      <Link
        href="/settings/notifications"
        className={navLinkClass(pathname.startsWith("/settings"))}
      >
        Notifications
      </Link>
    </nav>
  );
}
