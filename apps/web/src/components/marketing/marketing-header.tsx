"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { MobileNav } from "@/components/mobile-nav";

type MarketingHeaderProps = {
  /** Reserved — signed-in marketing pages use AppHeader instead. */
  signedIn?: boolean;
  userName?: string;
};

function linkClass(active: boolean) {
  return `rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-card hover:text-foreground ${
    active ? "bg-accent-muted/40 text-accent" : "text-muted"
  }`;
}

/**
 * Signed-out marketing chrome for `/`, `/about`, and blog.
 * Signed-in users see `AppHeader` (logo + tagline + Home/About before Groups).
 * Below `md`, links collapse into a hamburger menu so the top bar stays a
 * single compact row on phones. Sign in and Sign up are peer links.
 */
export function MarketingHeader(_props: MarketingHeaderProps = {}) {
  const pathname = usePathname();
  const homeActive = pathname === "/";
  const aboutActive = pathname === "/about";
  const blogActive = pathname === "/blog" || pathname.startsWith("/blog/");

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:gap-4 md:py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="md:hidden">
            <Logo href="/" size="sm" />
          </span>
          <span className="hidden md:inline">
            <Logo href="/" size="md" />
          </span>
          <span className="relative -top-[3px] hidden text-base text-muted md:inline">
            Social Group Betting
          </span>
        </div>
        <nav
          className="hidden items-center gap-1 sm:gap-2 md:flex"
          aria-label="Primary"
        >
          <Link href="/" className={linkClass(homeActive)}>
            Home
          </Link>
          <Link href="/about" className={linkClass(aboutActive)}>
            About
          </Link>
          <Link href="/blog" className={linkClass(blogActive)}>
            Blog
          </Link>
          <Link href="/sign-in" className={linkClass(pathname === "/sign-in")}>
            Sign in
          </Link>
          <Link href="/sign-up" className={linkClass(pathname === "/sign-up")}>
            Sign up
          </Link>
        </nav>
        <MobileNav
          links={[
            { href: "/", label: "Home", active: homeActive },
            { href: "/about", label: "About", active: aboutActive },
            { href: "/blog", label: "Blog", active: blogActive },
            { href: "/sign-in", label: "Sign in", active: pathname === "/sign-in" },
            { href: "/sign-up", label: "Sign up", active: pathname === "/sign-up" },
          ]}
        />
      </div>
    </header>
  );
}
