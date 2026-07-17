"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { AppNav, useAppNavItems } from "./app-nav";
import { MobileNav } from "./mobile-nav";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:py-4">
        <div className="flex items-center gap-2.5">
          <Logo href="/" size="md" />
          <span className="relative -top-[3px] hidden text-sm text-muted md:inline">
            Social Group Betting
          </span>
        </div>
        <nav className="hidden items-center gap-4 text-sm md:flex">
          <Link href="/" className="text-muted hover:text-foreground">
            Home
          </Link>
          <Link href="/about" className="text-muted hover:text-foreground">
            About
          </Link>
          <Link href="/sign-in" className="text-muted hover:text-foreground">
            Sign in
          </Link>
          <Link href="/sign-up" className="text-muted hover:text-foreground">
            Sign up
          </Link>
        </nav>
        <MobileNav
          links={[
            { href: "/", label: "Home" },
            { href: "/about", label: "About" },
            { href: "/sign-in", label: "Sign in" },
            { href: "/sign-up", label: "Sign up" },
          ]}
        />
      </div>
    </header>
  );
}

export function AppHeader({ userName }: { userName: string }) {
  const pathname = usePathname();
  const navItems = useAppNavItems();
  const accountActive = pathname === "/account";
  const accountLabel = userName ? `Account · ${userName}` : "Account";

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:gap-4 md:py-4">
        <div className="flex min-w-0 items-center gap-x-6">
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="md:hidden">
              <Logo href="/" size="sm" />
            </span>
            <span className="hidden md:inline">
              <Logo href="/" size="md" />
            </span>
            <span className="relative -top-[3px] hidden text-sm text-muted md:inline">
              Social Group Betting
            </span>
          </div>
          <AppNav />
        </div>
        <Link
          href="/account"
          className="hidden shrink-0 rounded-lg px-2 py-1.5 text-sm text-muted transition-colors hover:bg-accent-muted/30 hover:text-foreground md:inline"
          title="Account & settings"
        >
          Hi, {userName}
        </Link>
        <MobileNav
          links={[
            ...navItems,
            {
              href: "/account",
              label: accountLabel,
              active: accountActive,
            },
          ]}
        />
      </div>
    </header>
  );
}
