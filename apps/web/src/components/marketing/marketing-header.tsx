import Link from "next/link";
import { Logo } from "@/components/logo";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-2.5">
          <Logo href="/" size="md" />
          <span className="hidden pt-0.5 text-sm text-muted md:inline">
            — Social Group Betting
          </span>
        </div>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/about"
            className="rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:bg-card hover:text-foreground"
          >
            About
          </Link>
          <Link
            href="/sign-in"
            className="hidden rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-black transition-colors hover:bg-accent-bright"
          >
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}
