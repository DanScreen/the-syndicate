"use client";

import type { Fixture } from "@the-syndicate/shared";
import { useEffect, useState } from "react";

type Leg = {
  id: string;
  user: { id: string; name: string };
  homeTeam: string;
  awayTeam: string;
  selectionLabel: string;
  marketLabel: string;
  odds: number;
  bookmakerName: string;
  outcome: string;
  pointsAwarded: number;
};

type ActiveRound = {
  id: string;
  status: string;
  combinedOdds: number | null;
  bestBookmakerId: string | null;
  profitLossGbp: number | null;
  legs: Leg[];
};

export function SubmitLegForm({
  roundId,
  userId,
  onSubmitted,
}: {
  roundId: string;
  userId: string;
  onSubmitted: () => void;
}) {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [fixtureId, setFixtureId] = useState("");
  const [marketType, setMarketType] = useState("");
  const [selectionId, setSelectionId] = useState("");
  const [bookmakerId, setBookmakerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/fixtures")
      .then((r) => r.json())
      .then((d) => setFixtures(d.fixtures ?? []));
  }, []);

  const fixture = fixtures.find((f) => f.id === fixtureId);
  const market = fixture?.markets.find((m) => m.type === marketType);
  const selection = market?.selections.find((s) => s.id === selectionId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/legs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roundId, fixtureId, marketType, selectionId, bookmakerId }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to submit leg");
      return;
    }

    onSubmitted();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h3 className="font-semibold">Submit your leg</h3>
      <select
        value={fixtureId}
        onChange={(e) => {
          setFixtureId(e.target.value);
          setMarketType("");
          setSelectionId("");
          setBookmakerId("");
        }}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        required
      >
        <option value="">Select fixture</option>
        {fixtures.map((f) => (
          <option key={f.id} value={f.id}>
            {f.homeTeam} vs {f.awayTeam}
          </option>
        ))}
      </select>

      {fixture && (
        <select
          value={marketType}
          onChange={(e) => {
            setMarketType(e.target.value);
            setSelectionId("");
            setBookmakerId("");
          }}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          required
        >
          <option value="">Select market</option>
          {fixture.markets.map((m) => (
            <option key={m.type} value={m.type}>
              {m.label}
            </option>
          ))}
        </select>
      )}

      {market && (
        <select
          value={selectionId}
          onChange={(e) => {
            setSelectionId(e.target.value);
            setBookmakerId("");
          }}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          required
        >
          <option value="">Select pick</option>
          {market.selections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      )}

      {selection && (
        <select
          value={bookmakerId}
          onChange={(e) => setBookmakerId(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          required
        >
          <option value="">Select bookmaker</option>
          {selection.odds.map((o) => (
            <option key={o.bookmakerId} value={o.bookmakerId}>
              {o.bookmakerName} @ {o.odds}
            </option>
          ))}
        </select>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-accent py-2 text-sm font-medium text-black hover:bg-green-400 disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit leg"}
      </button>
    </form>
  );
}

export function SettleRoundForm({
  round,
  onSettled,
}: {
  round: ActiveRound;
  onSettled: () => void;
}) {
  const [outcomes, setOutcomes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch(`/api/rounds/${round.id}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        legOutcomes: round.legs.map((l) => ({
          legId: l.id,
          outcome: outcomes[l.id] ?? "lost",
        })),
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to settle");
      return;
    }

    onSettled();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h3 className="font-semibold">Settle round (owner)</h3>
      <p className="text-sm text-muted">Mark each leg won, lost, or void.</p>
      {round.legs.map((leg) => (
        <div key={leg.id} className="flex items-center justify-between gap-2 text-sm">
          <span>
            {leg.user.name}: {leg.selectionLabel} ({leg.odds})
          </span>
          <select
            value={outcomes[leg.id] ?? "lost"}
            onChange={(e) =>
              setOutcomes((prev) => ({ ...prev, [leg.id]: e.target.value }))
            }
            className="rounded border border-border bg-background px-2 py-1"
          >
            <option value="won">Won</option>
            <option value="lost">Lost</option>
            <option value="void">Void</option>
          </select>
        </div>
      ))}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg border border-accent py-2 text-sm font-medium text-accent hover:bg-accent-muted"
      >
        {loading ? "Settling..." : "Settle round & award points"}
      </button>
    </form>
  );
}

export function LegsList({ legs }: { legs: Leg[] }) {
  if (legs.length === 0) {
    return <p className="text-sm text-muted">No legs submitted yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {legs.map((leg) => (
        <li
          key={leg.id}
          className="rounded-lg border border-border bg-card px-4 py-3 text-sm"
        >
          <div className="flex justify-between">
            <span className="font-medium">{leg.user.name}</span>
            <span className="text-accent">{leg.odds}</span>
          </div>
          <p className="text-muted">
            {leg.homeTeam} vs {leg.awayTeam} · {leg.marketLabel}: {leg.selectionLabel}
          </p>
          <p className="text-xs text-muted">
            {leg.bookmakerName}
            {leg.outcome !== "pending" && (
              <> · {leg.outcome} (+{leg.pointsAwarded} pts)</>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function Leaderboard({
  entries,
}: {
  entries: {
    userId: string;
    name: string;
    points: number;
    legsWon: number;
    legsLost: number;
    role?: string;
  }[];
}) {
  return (
    <ol className="space-y-2">
      {entries.map((entry, i) => (
        <li
          key={entry.userId}
          className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm"
        >
          <div className="flex items-center gap-3">
            <span className="w-6 text-muted">#{i + 1}</span>
            <div>
              <p className="font-medium">
                {entry.name}
                {entry.role === "owner" && (
                  <span className="ml-2 text-xs text-accent">owner</span>
                )}
              </p>
              <p className="text-xs text-muted">
                {entry.legsWon}W / {entry.legsLost}L
              </p>
            </div>
          </div>
          <span className="font-semibold text-accent">{entry.points} pts</span>
        </li>
      ))}
    </ol>
  );
}
