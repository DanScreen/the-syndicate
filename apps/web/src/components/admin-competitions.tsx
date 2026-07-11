"use client";

import { useCallback, useEffect, useState } from "react";

type CompetitionRow = {
  id: string;
  name: string;
  enabled: boolean;
  oddsApiSport: string;
  footballDataCode: string;
};

export function AdminCompetitionsPanel() {
  const [competitions, setCompetitions] = useState<CompetitionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const res = await fetch("/api/admin/competitions");
    if (!res.ok) {
      setError("Failed to load competitions");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setCompetitions(data.competitions ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(competitionId: string, enabled: boolean) {
    setSavingId(competitionId);
    setError("");
    const res = await fetch("/api/admin/competitions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competitionId, enabled }),
    });
    setSavingId(null);
    if (!res.ok) {
      setError("Failed to update competition");
      return;
    }
    const data = await res.json();
    setCompetitions((rows) =>
      rows.map((row) => (row.id === data.competition.id ? data.competition : row))
    );
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading competitions...</p>;
  }

  const enabledCount = competitions.filter((c) => c.enabled).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {enabledCount} of {competitions.length} competitions visible in the leg picker.
        Disabled leagues stay in the catalogue for later — match sync still runs for settlement.
      </p>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <ul className="space-y-3">
        {competitions.map((competition) => (
          <li
            key={competition.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-4"
          >
            <div>
              <p className="font-medium">{competition.name}</p>
              <p className="mt-1 text-xs text-muted">
                {competition.id} · Odds API: {competition.oddsApiSport} · football-data:{" "}
                {competition.footballDataCode}
              </p>
            </div>
            <label className="flex items-center gap-3 text-sm">
              <span className={competition.enabled ? "text-accent" : "text-muted"}>
                {competition.enabled ? "Live for users" : "Hidden"}
              </span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-accent"
                checked={competition.enabled}
                disabled={savingId === competition.id}
                onChange={(e) => void toggle(competition.id, e.target.checked)}
              />
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
