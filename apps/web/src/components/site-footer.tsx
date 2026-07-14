"use client";

import { useState } from "react";

export function GamblingFooter() {
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-muted">
        <p className="font-medium text-foreground">Gamble responsibly</p>
        <p className="mt-2 max-w-2xl">
          Tiki Acca helps groups coordinate accumulator ideas. We do not take
          bets or handle money. You place bets directly with licensed bookmakers.
        </p>
        <p className="mt-3">
          Need support? Visit{" "}
          <a
            href="https://www.begambleaware.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            BeGambleAware.org
          </a>{" "}
          or call the National Gambling Helpline on <strong>0808 8020 133</strong>.
        </p>
        <p className="mt-4 text-xs">© {new Date().getFullYear()} Tiki Acca</p>
      </div>
    </footer>
  );
}

export function CopyInviteButton({ inviteUrl }: { inviteUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
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
      onClick={copy}
      className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-background"
    >
      {copied ? "Copied!" : "Copy invite link"}
    </button>
  );
}
