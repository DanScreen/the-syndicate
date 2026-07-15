"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:border-accent/50 hover:text-foreground"
    >
      Sign out
    </button>
  );
}
