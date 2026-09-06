"use client";

import type { AdminResultsMatch } from "@/lib/admin/compute-admin-results";
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

function outcomeClass(outcome: string): string {
  if (outcome === "won") return "text-success";
  if (outcome === "lost") return "text-danger";
  return "text-muted";
}

function MatchOverrideCard({ match }: { match: AdminResultsMatch }) {
  const router = useRouter();
  const [homeGoals, setHomeGoals] = useState(String(match.homeGoals ?? 0));
  const [awayGoals, setAwayGoals] = useState(String(match.awayGoals ?? 0));
  const [loading, setLoading] = useState(false);
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const confirming =
    match.status === "FINISHED" && !match.confirmed && !match.scoreLocked;
  const remainingMins = Math.ceil(match.confirmationRemainingMs / 60_000);

  async function handleOverride() {
    setLoading(true);
    setError("");
    setMessage("");

    const res = await fetch(`/api/admin/matches/${match.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        homeGoals: Number(homeGoals),
        awayGoals: Number(awayGoals),
        status: "FINISHED",
        lockScore: true,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Override failed");
      return;
    }

    setMessage(
      `Score locked ${data.homeGoals}–${data.awayGoals}. Corrected ${data.legsCorrected} leg(s), resolved ${data.legsResolved}, settled ${data.roundsSettled} round(s).`
    );
    router.refresh();
  }

  async function handleCorrect(legId: string, outcome: string) {
    setCorrectingId(legId);
    setError("");
    const res = await fetch(`/api/admin/legs/${legId}/correct-outcome`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome }),
    });
    const data = await res.json();
    setCorrectingId(null);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Correction failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">
            {match.homeTeam} vs {match.awayTeam}
          </h3>
          <p className="text-xs text-muted">
            {match.competitionId} · {formatKickoff(match.kickoff)} · {match.status}
            {match.homeGoals !== null && match.awayGoals !== null
              ? ` · feed ${match.homeGoals}–${match.awayGoals}`
              : ""}
            {match.scoreLocked ? " · score locked by admin" : ""}
          </p>
          {confirming && (
            <p className="mt-1 text-xs text-accent">
              Confirming FT result — auto-settle waits ~{remainingMins}m for feed
              corrections
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-muted">
            Home
            <input
              type="number"
              min={0}
              max={99}
              value={homeGoals}
              onChange={(e) => setHomeGoals(e.target.value)}
              className="mt-1 block w-16 rounded border border-border bg-background px-2 py-1 text-sm"
            />
          </label>
          <label className="text-xs text-muted">
            Away
            <input
              type="number"
              min={0}
              max={99}
              value={awayGoals}
              onChange={(e) => setAwayGoals(e.target.value)}
              className="mt-1 block w-16 rounded border border-border bg-background px-2 py-1 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={handleOverride}
            disabled={loading}
            className="rounded-lg border border-accent px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent-muted/30 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Override & lock"}
          </button>
        </div>
      </div>

      {match.legs.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-border pt-3">
          {match.legs.map((leg) => (
            <li
              key={leg.id}
              className="flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <div>
                <p>
                  <span className="text-muted">{leg.groupName}</span>
                  {" · "}
                  {leg.userName}: {leg.selectionLabel}{" "}
                  <span className="text-muted">({leg.marketLabel})</span>
                </p>
                <p className="text-xs text-muted">
                  Round {leg.roundStatus} ·{" "}
                  <span className={outcomeClass(leg.outcome)}>{leg.outcome}</span>
                </p>
              </div>
              <select
                defaultValue=""
                disabled={correctingId === leg.id}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) void handleCorrect(leg.id, value);
                  e.target.value = "";
                }}
                className="rounded border border-border bg-background px-2 py-1 text-xs"
              >
                <option value="" disabled>
                  Correct outcome…
                </option>
                {(["won", "lost", "void"] as const)
                  .filter((o) => o !== leg.outcome)
                  .map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
              </select>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      {message && <p className="mt-3 text-sm text-success">{message}</p>}
    </div>
  );
}

export function AdminResults({ matches }: { matches: AdminResultsMatch[] }) {
  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted">
        No recent matches with picks. Override a score here when the feed gets a
        disallowed goal or provisional FT wrong.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {matches.map((match) => (
        <MatchOverrideCard key={match.id} match={match} />
      ))}
    </div>
  );
}
