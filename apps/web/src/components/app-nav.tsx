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

export type AppNavItem = {
  href: string;
  label: string;
  active: boolean;
};

export function useAppNavItems(): AppNavItem[] {
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

  const items: AppNavItem[] = [
    { href: "/", label: "Home", active: homeActive },
    { href: "/about", label: "About", active: aboutActive },
    { href: "/dashboard", label: "Groups", active: groupsActive },
    { href: "/performance", label: "Performance", active: performanceActive },
  ];

  if (isAdmin) {
    items.push({ href: "/admin", label: "Admin", active: adminActive });
  }

  items.push({ href: "/blog", label: "Blog", active: blogActive });
  return items;
}

/** Desktop inline nav — hidden below `md`. */
export function AppNav() {
  const items = useAppNavItems();

  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className={navLinkClass(item.active)}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
