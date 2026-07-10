"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "./sign-out-button";
import { AppNav } from "./app-nav";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          The <span className="text-accent">Syndicate</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/sign-in" className="text-muted hover:text-foreground">
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg bg-accent px-3 py-1.5 font-medium text-black hover:bg-green-400"
          >
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function AppHeader({ userName }: { userName: string }) {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-bold tracking-tight">
            The <span className="text-accent">Syndicate</span>
          </Link>
          <AppNav />
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden text-muted sm:inline">Hi, {userName}</span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
