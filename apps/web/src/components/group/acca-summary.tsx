"use client";

import { useState } from "react";
import { BOOKMAKER_RANKINGS_PREVIEW_COUNT, formatOdds } from "@tiki-acca/shared";
import type { AccaBookmakerRanking } from "@tiki-acca/shared";
import {
  BookmakerLogo,
  bookmakerRankBadgeClass,
  bookmakerRankLabel,
  bookmakerRankPlace,
  bookmakerRankRowClass,
} from "@/components/bookmaker-logo";
import { Chevron } from "./round-helpers";

export function AccaSummary({
  combinedOdds,
  bookmakerName,
  bookmakerId,
  singleBookmaker,
  bookmakerRankings = [],
  betslipLink,
  betslipLinkQuality = null,
  betslipHasAllLegLinks = false,
  legCount = 1,
  inProgress = false,
  preview = false,
  showBookmakerCompare = true,
  compareDefaultOpen = true,
}: {
  combinedOdds: number;
  bookmakerName?: string | null;
  bookmakerId?: string | null;
  singleBookmaker: boolean;
  bookmakerRankings?: AccaBookmakerRanking[];
  betslipLink?: string | null;
  betslipLinkQuality?: "deeplink" | "hub" | null;
  betslipHasAllLegLinks?: boolean;
  legCount?: number;
  /** Locked acca — frozen odds copy; outcomes may be in progress. */
  inProgress?: boolean;
  /** Open round — live current odds from legs so far. */
  preview?: boolean;
  /** Show ranked bookmaker list. */
  showBookmakerCompare?: boolean;
  /** Initial expanded/collapsed state of the compare list (collapse once the bet is underway). */
  compareDefaultOpen?: boolean;
}) {
  const [bookmakersOpen, setBookmakersOpen] = useState(compareDefaultOpen);
  const [expandedBookmakerRankingKey, setExpandedBookmakerRankingKey] = useState<
    string | null
  >(null);
  const topBookmaker = bookmakerRankings[0];
  const showCompare = showBookmakerCompare && bookmakerRankings.length > 0;
  const bookmakerRankingKey = bookmakerRankings
    .map((entry) => entry.bookmakerId)
    .join(",");
  const showAllBookmakers =
    expandedBookmakerRankingKey === bookmakerRankingKey;
  const canExpandBookmakers =
    bookmakerRankings.length > BOOKMAKER_RANKINGS_PREVIEW_COUNT;
  const visibleBookmakerRankings = showAllBookmakers
    ? bookmakerRankings
    : bookmakerRankings.slice(0, BOOKMAKER_RANKINGS_PREVIEW_COUNT);
  const oddsLabel = inProgress
    ? "Locked combined odds"
    : preview
      ? "Current combined odds"
      : "Combined odds";
  const bookmakerLine = inProgress
    ? `Locked at ${bookmakerName}`
    : preview
      ? `Best so far at ${bookmakerName}`
      : `Best at ${bookmakerName}`;

  const ctaBookmaker =
    (inProgress && bookmakerName) ||
    (!inProgress && topBookmaker?.bookmakerName) ||
    bookmakerName ||
    null;
  const linkQuality =
    betslipLinkQuality ??
    topBookmaker?.linkQuality ??
    (topBookmaker?.url ? "deeplink" : null);
  const multiLeg = legCount > 1;
  const ctaLabel =
    linkQuality === "hub"
      ? ctaBookmaker
        ? `Open ${ctaBookmaker}`
        : "Open bookmaker"
      : multiLeg
        ? `Open first pick${ctaBookmaker ? ` · ${ctaBookmaker}` : ""}`
        : `Open betslip${ctaBookmaker ? ` · ${ctaBookmaker}` : ""}`;
  const ctaHint =
    linkQuality === "hub"
      ? "Opens the bookmaker’s football section. Add each pick on-site, or use Open on a pick when a deeplink is available."
      : multiLeg
        ? betslipHasAllLegLinks
          ? "Opens the first selection. Use Open on each pick below to add the rest at this bookmaker."
          : "Opens the closest available selection. Use Open on each pick to build the acca."
        : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent-muted/20 px-4 py-3 text-sm">
        <div>
          <p className="font-semibold">{oddsLabel}</p>
          <p className="text-2xl font-bold text-accent">{formatOdds(combinedOdds)}</p>
          {singleBookmaker && bookmakerName && (
            <p className="mt-1 flex items-center gap-2 text-xs text-muted">
              {bookmakerId ? (
                <BookmakerLogo bookmakerId={bookmakerId} name={bookmakerName} size={18} />
              ) : null}
              <span>{bookmakerLine}</span>
            </p>
          )}
          {preview ? (
            <p className="mt-1 text-xs text-muted">
              Based on legs submitted so far. Final odds lock when the bet closes.
            </p>
          ) : null}
          {!singleBookmaker && !preview && (
            <p className="mt-0.5 text-xs text-warning">
              {inProgress ? "Best per-leg odds locked at submission" : "Place legs individually"}
            </p>
          )}
        </div>
        {betslipLink && (
          <div className="flex max-w-xs flex-col items-end gap-1.5">
            <a
              href={betslipLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-on-accent hover:bg-accent-bright"
            >
              {ctaLabel}
            </a>
            {ctaHint ? <p className="text-right text-xs leading-snug text-muted">{ctaHint}</p> : null}
          </div>
        )}
      </div>

      {betslipLink ? (
        <p className="text-xs leading-snug text-muted">
          18+. Bets are placed with licensed bookmakers, not Tiki Acca. We may
          earn commission if you sign up or bet via these links. Gamble
          responsibly —{" "}
          <a
            href="https://www.begambleaware.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            BeGambleAware.org
          </a>
          .
        </p>
      ) : null}

      {showCompare && (
        <div className="rounded-xl border border-border bg-card text-sm">
          <button
            type="button"
            aria-expanded={bookmakersOpen}
            onClick={() => setBookmakersOpen((o) => !o)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="font-medium">
              Compare bookmakers
              <span className="ml-2 text-muted">({bookmakerRankings.length})</span>
            </span>
            <span className="text-muted">
              <Chevron open={bookmakersOpen} />
            </span>
          </button>
          {bookmakersOpen && (
            <ol className="space-y-2 border-t border-border px-2 py-2">
              {visibleBookmakerRankings.map((entry, index) => {
                const place = bookmakerRankPlace(index);
                const qualityHint =
                  entry.linkQuality === "hub"
                    ? "Football hub"
                    : entry.hasAllLegLinks === false && entry.url
                      ? "First pick only"
                      : null;
                return (
                  <li
                    key={entry.bookmakerId}
                    className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${bookmakerRankRowClass(place)}`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`inline-flex shrink-0 items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide ${bookmakerRankBadgeClass(place)}`}
                      >
                        {bookmakerRankLabel(place, index)}
                      </span>
                      <BookmakerLogo
                        bookmakerId={entry.bookmakerId}
                        name={entry.bookmakerName}
                        size={place === 1 ? 32 : place === "other" ? 24 : 28}
                      />
                      <span className="min-w-0">
                        <span
                          className={`block truncate ${
                            place === 1
                              ? "text-base font-semibold text-foreground"
                              : place === "other"
                                ? "font-medium text-foreground"
                                : "font-semibold text-foreground"
                          }`}
                        >
                          {entry.bookmakerName}
                        </span>
                        {qualityHint ? (
                          <span className="text-xs text-warning">{qualityHint}</span>
                        ) : null}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span
                        className={
                          place === 1
                            ? "text-lg font-bold text-accent"
                            : place === "other"
                              ? "font-medium tabular-nums"
                              : "text-base font-semibold tabular-nums text-foreground"
                        }
                      >
                        {formatOdds(entry.combinedOdds)}
                      </span>
                      {entry.url && (
                        <a
                          href={entry.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`rounded border px-2 py-0.5 text-xs font-medium hover:bg-accent-muted/30 ${
                            place === 1
                              ? "border-accent bg-accent/15 text-accent"
                              : "border-accent/50 text-accent"
                          }`}
                        >
                          Open
                        </a>
                      )}
                    </span>
                  </li>
                );
              })}
              {canExpandBookmakers && (
                <li>
                  <button
                    type="button"
                    aria-expanded={showAllBookmakers}
                    onClick={() =>
                      setExpandedBookmakerRankingKey((key) =>
                        key === bookmakerRankingKey ? null : bookmakerRankingKey,
                      )
                    }
                    className="w-full rounded-lg px-3 py-2 text-center text-sm font-medium text-accent hover:bg-accent-muted/30"
                  >
                    {showAllBookmakers
                      ? `Show top ${BOOKMAKER_RANKINGS_PREVIEW_COUNT}`
                      : `Show all ${bookmakerRankings.length} bookmakers`}
                  </button>
                </li>
              )}
            </ol>
          )}
        </div>
      )}

      {singleBookmaker && bookmakerId && !betslipLink && !inProgress && (
        <p className="text-xs text-muted">
          Leg odds are priced at {bookmakerName ?? bookmakerId} for this acca.
        </p>
      )}
    </div>
  );
}
