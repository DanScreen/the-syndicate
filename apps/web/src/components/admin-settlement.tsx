"use client";

import type { SettlementQueueRound } from "@/lib/admin/compute-settlement-queue";
import { useRouter } from "next/navigation";
import { useState } from "react";

function formatKickoff(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function hoursSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (60 * 60 * 1000));
}

function outcomeBadgeClass(outcome: string): string {
  if (outcome === "won") return "border-green-500/40 bg-green-500/10 text-green-400";
  if (outcome === "lost") return "border-red-500/40 bg-red-500/10 text-red-400";
  if (outcome === "void") return "border-border bg-card text-muted";
  return "border-border bg-card text-muted";
}

function SettleRoundCard({ round }: { round: SettlementQueueRound }) {
  const router = useRouter();
  const earlySettled = round.status === "settled";
  const actionableLegs = earlySettled
    ? round.legs.filter((l) => l.outcome === "pending")
    : round.legs;
  // Pre-fill outcomes the system already resolved; admin fills the rest.
  const [outcomes, setOutcomes] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      round.legs.filter((l) => l.outcome !== "pending").map((l) => [l.id, l.outcome])
    )
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const allChosen = actionableLegs.every((l) => outcomes[l.id]);

  async function handleSettle() {
    setLoading(true);
    setError("");

    const res = await fetch(`/api/admin/rounds/${round.id}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        legOutcomes: actionableLegs.map((l) => ({
          legId: l.id,
          outcome: outcomes[l.id],
        })),
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Failed to settle round");
      return;
    }

    router.refresh();
  }

  const needsAttention = round.overdueCount > 0;

  return (
    <div
      className={`rounded-xl border p-5 ${
        needsAttention ? "border-red-500/50 bg-red-500/5" : "border-border bg-card"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">{round.groupName}</h3>
          <p className="text-xs text-muted">
            {earlySettled
              ? `Settled early (loss) ${round.settledAt ? formatKickoff(round.settledAt) : "—"}`
              : `Locked ${round.lockedAt ? formatKickoff(round.lockedAt) : "—"}`}
            {round.combinedOdds ? ` · combined odds ${round.combinedOdds}` : ""}
            {` · ${round.resolvedCount}/${round.legs.length} legs resolved`}
          </p>
        </div>
        {needsAttention && (
          <span className="rounded-full border border-red-500/50 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400">
            {round.overdueCount} leg{round.overdueCount === 1 ? "" : "s"} overdue
          </span>
        )}
      </div>

      <ul className="mt-4 space-y-2">
        {round.legs.map((leg) => (
          <li
            key={leg.id}
            className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
              leg.overdue ? "border-red-500/50 bg-red-500/10" : "border-border bg-background/40"
            }`}
          >
            <div>
              <p>
                <span className="text-muted">{leg.userName}:</span> {leg.selectionLabel}{" "}
                <span className="text-muted">({leg.marketLabel} @ {leg.odds})</span>
              </p>
              <p className="text-xs text-muted">
                {leg.homeTeam} vs {leg.awayTeam} · {leg.competition} · KO{" "}
                {formatKickoff(leg.kickoff)}
                {leg.overdue && (
                  <span className="ml-2 font-medium text-red-400">
                    Unresolved {hoursSince(leg.kickoff)}h after kickoff — check result
                  </span>
                )}
              </p>
            </div>
            {leg.outcome !== "pending" ? (
              <span
                className={`rounded border px-2 py-0.5 text-xs font-medium ${outcomeBadgeClass(leg.outcome)}`}
              >
                {leg.outcome}
              </span>
            ) : (
              <select
                value={outcomes[leg.id] ?? ""}
                onChange={(e) =>
                  setOutcomes((prev) => ({ ...prev, [leg.id]: e.target.value }))
                }
                className="rounded border border-border bg-background px-2 py-1 text-sm"
              >
                <option value="" disabled>
                  Outcome…
                </option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="void">Void</option>
              </select>
            )}
          </li>
        ))}
      </ul>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      <button
        type="button"
        onClick={handleSettle}
        disabled={loading || !allChosen}
        className="mt-4 w-full rounded-lg border border-accent py-2 text-sm font-medium text-accent hover:bg-accent-muted/30 disabled:opacity-50"
      >
        {loading
          ? earlySettled
            ? "Resolving..."
            : "Settling..."
          : allChosen
            ? earlySettled
              ? "Resolve remaining legs & award points"
              : "Settle round & award points"
            : "Choose an outcome for every pending leg"}
      </button>
    </div>
  );
}

export function AdminSettlement({ rounds }: { rounds: SettlementQueueRound[] }) {
  if (rounds.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted">
        No rounds waiting on results — the settlement cron is keeping up.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rounds.map((round) => (
        <SettleRoundCard key={round.id} round={round} />
      ))}
    </div>
  );
}
