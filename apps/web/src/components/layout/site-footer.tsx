"use client";

import { COMPLIANCE, copy } from "@tiki-acca/shared";
import Link from "next/link";
import { useState } from "react";

export function GamblingFooter() {
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-muted">
        <p className="font-medium text-foreground">{COMPLIANCE.footerTitle}</p>
        <p className="mt-2 max-w-2xl">{COMPLIANCE.footerBody}</p>
        <p className="mt-3">
          Need support? Visit{" "}
          <a
            href={COMPLIANCE.gambleawareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            {COMPLIANCE.gambleawareLabel}
          </a>{" "}
          or call the {COMPLIANCE.helplineName} on{" "}
          <strong>{COMPLIANCE.helplineNumber}</strong>.
        </p>
        <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs">
          <Link href="/about" className="hover:text-foreground hover:underline">
            About
          </Link>
          <Link href="/terms" className="hover:text-foreground hover:underline">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-foreground hover:underline">
            Privacy
          </Link>
          <Link href="/cookies" className="hover:text-foreground hover:underline">
            Cookies
          </Link>
        </nav>
        <p className="mt-4 text-xs">© {new Date().getFullYear()} Tiki Acca</p>
      </div>
    </footer>
  );
}

export function CopyInviteButton({ inviteUrl }: { inviteUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copyLink}
      className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-background"
    >
      {copied ? copy.invite.copied : copy.invite.copyLink}
    </button>
  );
}
