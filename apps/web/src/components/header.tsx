"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { AppNav } from "./app-nav";
import { SignOutButton } from "./sign-out-button";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Logo href="/" size="md" />
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/about" className="hidden text-muted hover:text-foreground sm:inline">
            About
          </Link>
          <Link href="/sign-in" className="text-muted hover:text-foreground">
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-lg bg-accent px-3 py-1.5 font-medium text-black hover:bg-accent-bright"
          >
            Sign up
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
          <Logo href="/" size="md" />
          <AppNav />
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link
            href="/about"
            className="hidden text-muted transition-colors hover:text-foreground sm:inline"
          >
            About
          </Link>
          <span className="hidden text-muted sm:inline">Hi, {userName}</span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
