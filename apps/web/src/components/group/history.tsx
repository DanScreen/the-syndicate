"use client";

import { copy, formatOdds } from "@tiki-acca/shared";

import { PointsText, pointsTextClass } from "@/components/points-text";
import {
  formatFixtureLabel,
  formatLegPoints,
  formatRoundStatusBadge,
  groupAccaRoundPoints,
  type HistoryRound,
  type LegOutcome,
} from "@tiki-acca/shared";
import { apiFetcher } from "@/lib/api-client";
import { useGroupHistory } from "@tiki-acca/client";
import { formatKickoff, legOutcomeLabel } from "@tiki-acca/shared";

function legOutcomeClass(outcome: string): string {
  if (outcome === "won") return "border-success-strong/40 bg-success-strong/10 text-success";
  if (outcome === "lost") return "border-danger-strong/40 bg-danger-strong/10 text-danger";
  if (outcome === "void") return "border-border bg-card text-muted";
  return "border-border bg-card text-muted";
}

function formatSettledAt(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function HistoryRoundCard({ round }: { round: HistoryRound }) {
  const outcomes = round.legs.map((l) => l.outcome as LegOutcome);
  const roundPoints = groupAccaRoundPoints(outcomes, round.combinedOdds ?? 1);
  const settledLabel = formatSettledAt(round.settledAt);

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {formatRoundStatusBadge(round.status)}
            {settledLabel ? ` · ${settledLabel}` : ""}
          </p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted">
            Group
          </p>
          <p className={`text-lg font-semibold tabular-nums ${pointsTextClass(roundPoints)}`}>
            {formatLegPoints(roundPoints)} pts
          </p>
        </div>
        {round.combinedOdds != null ? (
          <p className="text-sm text-muted">
            Acca @ <span className="font-medium text-foreground">{formatOdds(round.combinedOdds)}</span>
          </p>
        ) : null}
      </div>

      <ul className="mt-4 space-y-2">
        {round.legs.map((leg) => (
          <li
            key={leg.id}
            className={`rounded-lg border px-3 py-3 text-sm ${legOutcomeClass(leg.outcome)}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-foreground">{leg.user.name}</span>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-current/20 px-2 py-0.5 text-xs font-medium">
                  {legOutcomeLabel(leg.outcome)}
                </span>
                <span className="font-medium text-foreground/80">{formatOdds(leg.odds)}</span>
              </div>
            </div>
            <p className="mt-1 text-foreground">{formatFixtureLabel(leg)}</p>
            <p className="text-muted">
              {leg.marketLabel}: {leg.selectionLabel}
            </p>
            <p className="mt-1 text-xs text-muted">
              {leg.competition} · {formatKickoff(leg.kickoff)}
              {leg.pointsAwarded !== 0 || leg.outcome !== "pending" ? (
                <>
                  {" · "}
                  <PointsText
                    points={leg.pointsAwarded}
                    outcome={leg.outcome}
                    className="text-xs"
                  />
                </>
              ) : null}
            </p>
          </li>
        ))}
      </ul>
    </article>
  );
}

/** The Bet tab's settled bets: latest page first, "Show more" loads older ones. */
export function RoundHistory({
  groupId,
  recentRounds,
  settledRoundCount,
}: {
  groupId: string;
  recentRounds: HistoryRound[];
  settledRoundCount: number;
}) {
  const { rounds, hasMore, loadingMore, error, loadMore } = useGroupHistory({
    groupId,
    fetcher: apiFetcher,
    recentRounds,
    settledRoundCount,
  });

  if (rounds.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">{copy.history.title}</h2>
      <ul className="mt-4 space-y-4">
        {rounds.map((round) => (
          <li key={round.id}>
            <HistoryRoundCard round={round} />
          </li>
        ))}
      </ul>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      {hasMore ? (
        <button
          type="button"
          onClick={() => void loadMore()}
          disabled={loadingMore}
          className="mt-4 w-full rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-card disabled:opacity-60"
        >
          {loadingMore ? copy.history.loadingMore : copy.history.showMore}
        </button>
      ) : null}
    </section>
  );
}
