"use client";

import { PointsText, pointsTextClass } from "@/components/points-text";
import {
  formatLegPoints,
  formatRoundStatusBadge,
  groupAccaRoundPoints,
  type HistoryRound,
  type LegOutcome,
} from "@tiki-acca/shared";
import Link from "next/link";

function legOutcomeLabel(outcome: string): string {
  if (outcome === "won") return "Won";
  if (outcome === "lost") return "Lost";
  if (outcome === "void") return "Void";
  return "Awaiting";
}

function legOutcomeClass(outcome: string): string {
  if (outcome === "won") return "border-green-500/40 bg-green-500/10 text-green-400";
  if (outcome === "lost") return "border-red-500/40 bg-red-500/10 text-red-400";
  if (outcome === "void") return "border-border bg-card text-muted";
  return "border-border bg-card text-muted";
}

function formatKickoff(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
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
          <p className={`mt-1 text-lg font-semibold tabular-nums ${pointsTextClass(roundPoints)}`}>
            {formatLegPoints(roundPoints)} pts
          </p>
        </div>
        {round.combinedOdds != null ? (
          <p className="text-sm text-muted">
            Acca @ <span className="font-medium text-foreground">{round.combinedOdds}</span>
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
                <span className="font-medium text-accent">{leg.odds}</span>
              </div>
            </div>
            <p className="mt-1 text-foreground">
              {leg.homeTeam} vs {leg.awayTeam}
            </p>
            <p className="text-muted">
              {leg.marketLabel}: {leg.selectionLabel}
            </p>
            <p className="mt-1 text-xs text-muted">
              {leg.competition} · {formatKickoff(leg.kickoff)}
              {leg.pointsAwarded !== 0 ? (
                <>
                  {" · "}
                  <PointsText points={leg.pointsAwarded} className="text-xs" />
                </>
              ) : null}
            </p>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function RoundHistory({
  rounds,
  groupId,
}: {
  rounds: HistoryRound[];
  groupId?: string;
}) {
  if (rounds.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-lg font-semibold">Recent settled bets</h2>
        {groupId ? (
          <Link
            href={`/groups/${groupId}/history`}
            className="text-sm text-accent hover:underline"
          >
            Full history
          </Link>
        ) : null}
      </div>
      <ul className="mt-4 space-y-4">
        {rounds.map((round) => (
          <li key={round.id}>
            <HistoryRoundCard round={round} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function GroupBetHistory({
  rounds,
  loading,
}: {
  rounds: HistoryRound[];
  loading?: boolean;
}) {
  if (loading) {
    return <p className="text-sm text-muted">Loading bet history…</p>;
  }

  if (rounds.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
        No settled bets yet. History appears after your first round is settled.
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {rounds.map((round) => (
        <li key={round.id}>
          <HistoryRoundCard round={round} />
        </li>
      ))}
    </ul>
  );
}
