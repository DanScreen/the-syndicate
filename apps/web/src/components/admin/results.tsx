"use client";

import type { AdminResultsMatch } from "@/lib/admin/compute-admin-results";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatKickoff } from "@tiki-acca/shared";

function outcomeClass(outcome: string): string {
  if (outcome === "won") return "text-success";
  if (outcome === "lost") return "text-danger";
  return "text-muted";
}

const PROVIDER_LABELS: Record<string, string> = {
  api_football: "API-Football",
  football_data: "football-data",
};

function score(home: number | null, away: number | null): string {
  return home === null || away === null ? "—" : `${home}–${away}`;
}

function ObservationsTable({ match }: { match: AdminResultsMatch }) {
  if (match.observations.length === 0) return null;
  return (
    <table className="mt-3 w-full text-xs">
      <thead className="text-left text-muted">
        <tr>
          <th className="py-1 pr-3 font-normal">Source</th>
          <th className="py-1 pr-3 font-normal">Status</th>
          <th className="py-1 pr-3 font-normal">90&apos;</th>
          <th className="py-1 pr-3 font-normal">Final</th>
          <th className="py-1 pr-3 font-normal">Corners</th>
          <th className="py-1 font-normal">Last change</th>
        </tr>
      </thead>
      <tbody>
        {match.observations.map((obs) => (
          <tr key={obs.provider} className="border-t border-border/50">
            <td className="py-1 pr-3">{PROVIDER_LABELS[obs.provider] ?? obs.provider}</td>
            <td className="py-1 pr-3">{obs.status}</td>
            <td className="py-1 pr-3">{score(obs.homeGoals90, obs.awayGoals90)}</td>
            <td className="py-1 pr-3">
              {score(obs.homeGoalsEnd, obs.awayGoalsEnd)}
              {obs.extraTime ? " (AET)" : ""}
            </td>
            <td className="py-1 pr-3">
              {obs.corners ? `${obs.corners.home}–${obs.corners.away}` : "—"}
            </td>
            <td className="py-1 text-muted">{formatKickoff(obs.changedAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
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
    match.status === "FINISHED" &&
    !match.confirmed &&
    !match.scoreLocked &&
    !match.heldForReview;
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
            {match.resultSource === "agreed" ? " · sources agree" : ""}
            {match.wentToExtraTime ? " · went to extra time" : ""}
          </p>
          {match.heldForReview && (
            <p className="mt-1 text-xs font-medium text-amber-300">
              {match.resultSource === "conflict"
                ? "Results sources disagree — auto-settle is held. Check the scores below and override & lock the correct 90-minute score."
                : "No source can give the 90-minute score (extra time) — auto-settle is held. Override & lock the 90-minute score."}
            </p>
          )}
          {confirming && (
            <p className="mt-1 text-xs text-accent">
              Leg outcomes are provisional — rounds settle once the FT score
              stays unchanged ~{remainingMins}m (VAR / disallowed goals). Late
              feed corrections still auto-reconcile for 24h.
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

      <ObservationsTable match={match} />

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
