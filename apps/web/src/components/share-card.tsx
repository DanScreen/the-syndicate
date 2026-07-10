"use client";

import { buildShareText } from "@/lib/stats/compute-user-stats";
import { formatLegPoints } from "@the-syndicate/shared";
import { useState } from "react";

type ShareCardProps = {
  title: string;
  netPoints: number;
  legsPlayed: number;
  winRate: number | null;
  subtitle?: string;
};

export function ShareCard({
  title,
  netPoints,
  legsPlayed,
  winRate,
  subtitle,
}: ShareCardProps) {
  const [copied, setCopied] = useState(false);

  const shareText = buildShareText(title, {
    netPoints,
    legsPlayed,
    winRate,
  });

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: shareText });
        return;
      } catch {
        // fall through to copy
      }
    }

    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-accent-muted/20 to-card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-accent">Share</p>
      <h4 className="mt-1 text-lg font-semibold">{title}</h4>
      {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted">Net points</p>
          <p className="text-xl font-bold text-accent">{formatLegPoints(netPoints)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Legs</p>
          <p className="text-xl font-bold">{legsPlayed}</p>
        </div>
        {winRate != null && (
          <div>
            <p className="text-xs text-muted">Win rate</p>
            <p className="text-xl font-bold">{winRate}%</p>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={handleShare}
        className="mt-4 rounded-lg border border-accent/50 px-4 py-2 text-sm font-medium text-accent hover:bg-accent-muted/30"
      >
        {copied ? "Copied!" : "Share stats"}
      </button>
    </div>
  );
}
