"use client";

import { useCallback, useEffect, useState } from "react";

type Diagnostics = {
  checkedAt: string;
  competitionId: string;
  competitionName: string;
  oddsConfigured: boolean;
  sport: string;
  regions: string;
  cacheTtlMs: number;
  cache: {
    hit: boolean;
    cachedFixtureCount: number | null;
    remainingMs: number | null;
  };
  api: {
    ok: boolean;
    status: number | null;
    error: string | null;
    requestsRemaining: string | null;
    requestsUsed: string | null;
    usedCommenceTimeFrom: boolean;
  };
  counts: {
    rawEvents: number;
    withRetailBookmakers: number;
    mappedToFixtures: number;
    afterKickoffFilter: number;
  };
  sampleEvents: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    kickoff: string;
    bookmakerCount: number;
    retailBookmakerCount: number;
    mapped: boolean;
    inFuture: boolean;
    dropReason?: string;
  }[];
  sampleFixtures: {
    homeTeam: string;
    awayTeam: string;
    kickoff: string;
    marketCount: number;
  }[];
  interpretation: string[];
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function formatKickoff(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function AdminOddsDiagnosticsPanel() {
  const [competitionId, setCompetitionId] = useState("world-cup");
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch(
      `/api/admin/odds-diagnostics?competition=${encodeURIComponent(competitionId)}&fresh=true`
    );
    setLoading(false);
    if (!res.ok) {
      setError("Failed to load diagnostics");
      return;
    }
    const data = await res.json();
    setDiagnostics(data.diagnostics ?? null);
  }, [competitionId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-muted">Competition</span>
          <select
            value={competitionId}
            onChange={(e) => setCompetitionId(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2"
          >
            <option value="world-cup">FIFA World Cup</option>
            <option value="epl">Premier League</option>
            <option value="championship">Championship</option>
            <option value="league-one">League One</option>
            <option value="league-two">League Two</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-card disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh (bypass cache read)"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {diagnostics && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="API key"
              value={diagnostics.oddsConfigured ? "Configured" : "Missing"}
            />
            <Stat label="API status" value={diagnostics.api.ok ? "OK" : "Error"} />
            <Stat label="Raw events" value={diagnostics.counts.rawEvents} />
            <Stat label="User-facing fixtures" value={diagnostics.counts.afterKickoffFilter} />
          </section>

          <section className="rounded-xl border border-border bg-card p-5 text-sm">
            <h2 className="font-semibold">Pipeline</h2>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-muted">
              <li>
                Odds API <code className="text-foreground">{diagnostics.sport}</code> · region{" "}
                <code className="text-foreground">{diagnostics.regions}</code>
              </li>
              <li>{diagnostics.counts.rawEvents} events returned</li>
              <li>{diagnostics.counts.withRetailBookmakers} with retail bookmakers</li>
              <li>{diagnostics.counts.mappedToFixtures} mapped to fixtures (h2h/totals/spreads)</li>
              <li>{diagnostics.counts.afterKickoffFilter} after upcoming kickoff filter</li>
            </ol>
            <p className="mt-4 text-xs text-muted">
              Checked {formatKickoff(diagnostics.checkedAt)} · cache{" "}
              {diagnostics.cache.hit
                ? `hit (${diagnostics.cache.cachedFixtureCount ?? 0} fixtures, ${Math.round((diagnostics.cache.remainingMs ?? 0) / 1000)}s left)`
                : "miss"}{" "}
              · quota remaining {diagnostics.api.requestsRemaining ?? "—"}
            </p>
            {diagnostics.api.error && (
              <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-200">
                {diagnostics.api.error}
              </p>
            )}
          </section>

          {diagnostics.interpretation.length > 0 && (
            <section className="rounded-xl border border-accent/30 bg-accent-muted/20 p-5 text-sm">
              <h2 className="font-semibold text-accent">What this means</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-muted">
                {diagnostics.interpretation.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          )}

          {diagnostics.sampleEvents.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                Sample API events
              </h2>
              <div className="mt-3 overflow-x-auto rounded-xl border border-border">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-card text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-3">Match</th>
                      <th className="px-4 py-3">Kickoff</th>
                      <th className="px-4 py-3">Bookmakers</th>
                      <th className="px-4 py-3">Mapped</th>
                      <th className="px-4 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diagnostics.sampleEvents.map((event) => (
                      <tr key={event.id} className="border-t border-border">
                        <td className="px-4 py-3">
                          {event.homeTeam} vs {event.awayTeam}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatKickoff(event.kickoff)}</td>
                        <td className="px-4 py-3 tabular-nums">
                          {event.retailBookmakerCount}/{event.bookmakerCount} retail
                        </td>
                        <td className="px-4 py-3">
                          {event.mapped ? (
                            <span className="text-accent">Yes</span>
                          ) : (
                            <span className="text-muted">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {!event.inFuture && "Past kickoff · "}
                          {event.dropReason ?? (event.mapped ? "OK" : "")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {diagnostics.sampleFixtures.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                Fixtures users should see
              </h2>
              <ul className="mt-3 space-y-2">
                {diagnostics.sampleFixtures.map((fixture) => (
                  <li
                    key={`${fixture.homeTeam}-${fixture.awayTeam}-${fixture.kickoff}`}
                    className="rounded-lg border border-border bg-card px-4 py-3 text-sm"
                  >
                    <span className="font-medium">
                      {fixture.homeTeam} vs {fixture.awayTeam}
                    </span>
                    <span className="ml-2 text-muted">
                      {formatKickoff(fixture.kickoff)} · {fixture.marketCount} markets
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
