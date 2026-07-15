import Link from "next/link";
import { Logo } from "@/components/logo";

type MarketingHeaderProps = {
  /** Reserved — signed-in marketing pages use AppHeader instead. */
  signedIn?: boolean;
  userName?: string;
};

/**
 * Signed-out marketing chrome for `/`, `/about`, and blog.
 * Signed-in users see `AppHeader` (logo + tagline + Home/About before Groups).
 */
export function MarketingHeader(_props: MarketingHeaderProps = {}) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-2.5">
          <Logo href="/" size="md" />
          <span className="relative -top-[3px] hidden text-sm text-muted md:inline">
            Social Group Betting
          </span>
        </div>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className="rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:bg-card hover:text-foreground"
          >
            Home
          </Link>
          <Link
            href="/about"
            className="rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:bg-card hover:text-foreground"
          >
            About
          </Link>
          <Link
            href="/blog"
            className="rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:bg-card hover:text-foreground"
          >
            Blog
          </Link>
          <Link
            href="/sign-in"
            className="rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-black transition-colors hover:bg-accent-bright"
          >
            Sign up
          </Link>
        </nav>
      </div>
    </header>
  );
}
