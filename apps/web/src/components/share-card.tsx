"use client";

import { buildShareText } from "@/lib/stats/compute-user-stats";
import {
  renderPerformanceShareImage,
  type ShareChartPoint,
} from "@/lib/share/render-performance-image";
import { formatLegPoints, pointsTone } from "@the-syndicate/shared";
import { useCallback, useEffect, useState } from "react";

type ShareCardProps = {
  title: string;
  netPoints: number;
  legsPlayed: number;
  winRate: number | null;
  subtitle?: string;
  chart?: ShareChartPoint[] | { cumulativePoints: number }[];
};

export function ShareCard({
  title,
  netPoints,
  legsPlayed,
  winRate,
  subtitle,
  chart,
}: ShareCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState("");

  const shareText = buildShareText(title, {
    netPoints,
    legsPlayed,
    winRate,
  });

  const generateImage = useCallback(async () => {
    setGenerating(true);
    setError("");
    try {
      const blob = await renderPerformanceShareImage({
        title,
        subtitle,
        netPoints,
        legsPlayed,
        winRate,
        chart: chart?.map((p) => ({ cumulativePoints: p.cumulativePoints })),
      });
      setImageBlob(blob);
      setImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } catch {
      setError("Could not generate share image.");
      setImageBlob(null);
      setImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } finally {
      setGenerating(false);
    }
  }, [title, subtitle, netPoints, legsPlayed, winRate, chart]);

  useEffect(() => {
    return () => {
      setImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, []);

  useEffect(() => {
    if (!previewOpen) return;
    if (!imageBlob && !generating) void generateImage();
  }, [previewOpen, imageBlob, generating, generateImage]);

  useEffect(() => {
    if (!previewOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPreviewOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewOpen]);

  function openPreview() {
    setPreviewOpen(true);
    setError("");
  }

  async function handleShareImage() {
    if (!imageBlob) return;
    setSharing(true);
    setError("");

    try {
      const file = new File([imageBlob], "syndicate-performance.png", {
        type: "image/png",
      });

      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          const canShareFiles =
            !navigator.canShare || navigator.canShare({ files: [file] });
          if (canShareFiles) {
            await navigator.share({
              title,
              text: shareText,
              files: [file],
            });
            setPreviewOpen(false);
            return;
          }
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return;
        }
      }

      const link = document.createElement("a");
      link.href = URL.createObjectURL(imageBlob);
      link.download = "syndicate-performance.png";
      link.click();
      URL.revokeObjectURL(link.href);
      setPreviewOpen(false);
    } finally {
      setSharing(false);
    }
  }

  const tone = pointsTone(netPoints);
  const pointsClass =
    tone === "positive"
      ? "text-accent"
      : tone === "negative"
        ? "text-red-400"
        : "text-foreground";

  return (
    <>
      <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-accent-muted/20 to-card p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">Share</p>
        <h4 className="mt-1 text-lg font-semibold">{title}</h4>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted">Net points</p>
            <p className={`text-xl font-bold ${pointsClass}`}>
              {formatLegPoints(netPoints)}
            </p>
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

        <div className="mt-4">
          <button
            type="button"
            onClick={openPreview}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-bright"
          >
            Share image
          </button>
        </div>

        {error && !previewOpen ? (
          <p className="mt-2 text-sm text-red-400">{error}</p>
        ) : null}
        <p className="mt-2 text-xs text-muted">
          Preview your card, then share or download.
        </p>
      </div>

      {previewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close preview"
            className="absolute inset-0 bg-black/70"
            onClick={() => setPreviewOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-preview-title"
            className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-card p-4 shadow-xl"
          >
            <h5 id="share-preview-title" className="text-sm font-semibold">
              Share preview
            </h5>
            <p className="mt-0.5 text-xs text-muted">{title}</p>

            <div className="mt-3 overflow-hidden rounded-lg border border-border bg-background/40">
              {generating ? (
                <div className="flex aspect-square items-center justify-center text-sm text-muted">
                  Generating image…
                </div>
              ) : imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt={`${title} performance share card`}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center px-6 text-center text-sm text-muted">
                  Could not generate preview.
                </div>
              )}
            </div>

            {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => void handleShareImage()}
                disabled={!imageBlob || sharing}
                className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-bright disabled:opacity-50"
              >
                {sharing ? "Sharing…" : "Share"}
              </button>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:bg-background/60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
