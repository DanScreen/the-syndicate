"use client";

import type { Fixture, Market } from "@the-syndicate/shared";
import { formatLegPoints, legPointsForOutcome, type AccaBookmakerRanking } from "@the-syndicate/shared";
import { useEffect, useMemo, useState } from "react";
import { sortQuotesByBestOdds } from "@/lib/odds/bookmakers";
import { groupMarkets } from "@/lib/odds/market-groups";

type Leg = {
  id: string;
  user: { id: string; name: string };
  homeTeam: string;
  awayTeam: string;
  competition: string;
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

type Member = { id: string; name: string; role: string };

function formatKickoff(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RoundProgress({
  members,
  legs,
  status,
}: {
  members: Member[];
  legs: Leg[];
  status: string;
}) {
  const submittedIds = new Set(legs.map((l) => l.user.id));
  const pending = members.filter((m) => !submittedIds.has(m.id));

  let banner = "";
  if (status === "collecting") {
    banner =
      pending.length === 0
        ? "Everyone has submitted — locking acca..."
        : `Waiting on ${pending.length} leg${pending.length === 1 ? "" : "s"}`;
  } else if (status === "locked") {
    banner = "Acca locked — place your bet at the bookmaker";
  } else if (status === "settled") {
    banner = "Round settled";
  }

  return (
    <div className="space-y-3">
      {banner && (
        <div className="rounded-lg border border-accent/30 bg-accent-muted/40 px-4 py-3 text-sm text-accent">
          {banner}
        </div>
      )}
      <ul className="space-y-2">
        {members.map((member) => {
          const leg = legs.find((l) => l.user.id === member.id);
          const submitted = Boolean(leg);
          return (
            <li
              key={member.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm"
            >
              <span>
                {member.name}
                {member.role === "owner" && (
                  <span className="ml-2 text-xs text-muted">owner</span>
                )}
              </span>
              <span className={submitted ? "text-accent" : "text-muted"}>
                {submitted ? "✓ Submitted" : "Pending"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type Competition = { id: string; name: string };

export function SubmitLegForm({
  roundId,
  onSubmitted,
}: {
  roundId: string;
  onSubmitted: () => void;
}) {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loadingCompetitions, setLoadingCompetitions] = useState(true);
  const [competitionId, setCompetitionId] = useState("");
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [source, setSource] = useState<"live" | "mock">("mock");
  const [loadingFixtures, setLoadingFixtures] = useState(false);
  const [fixtureId, setFixtureId] = useState("");
  const [fixtureMarkets, setFixtureMarkets] = useState<Market[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const [marketType, setMarketType] = useState("");
  const [selectionId, setSelectionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [marketsError, setMarketsError] = useState("");

  useEffect(() => {
    fetch("/api/competitions")
      .then((r) => r.json())
      .then((d) => {
        setCompetitions(d.competitions ?? []);
      })
      .finally(() => setLoadingCompetitions(false));
  }, []);

  useEffect(() => {
    if (!competitionId) {
      setFixtures([]);
      setFixtureId("");
      return;
    }

    setLoadingFixtures(true);
    setFixtureId("");
    setMarketType("");
    setSelectionId("");
    fetch(`/api/fixtures?competition=${encodeURIComponent(competitionId)}`)
      .then((r) => r.json())
      .then((d) => {
        setFixtures(d.fixtures ?? []);
        setSource(d.source ?? "mock");
      })
      .finally(() => setLoadingFixtures(false));
  }, [competitionId]);

  useEffect(() => {
    if (!fixtureId || !competitionId) {
      setFixtureMarkets([]);
      return;
    }

    setLoadingMarkets(true);
    setMarketsError("");
    fetch(
      `/api/fixtures/${fixtureId}/markets?competition=${encodeURIComponent(competitionId)}`
    )
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setFixtureMarkets([]);
          setMarketsError(d.error ?? "Failed to load extra markets");
          return;
        }
        setFixtureMarkets(d.markets ?? []);
      })
      .catch(() => {
        setFixtureMarkets([]);
        setMarketsError("Failed to load extra markets");
      })
      .finally(() => setLoadingMarkets(false));
  }, [fixtureId, competitionId]);

  const fixture = fixtures.find((f) => f.id === fixtureId);
  const allMarkets = fixtureMarkets.length > 0 ? fixtureMarkets : (fixture?.markets ?? []);
  const marketGroups = useMemo(() => groupMarkets(allMarkets), [allMarkets]);
  const market = allMarkets.find((m) => m.type === marketType);
  const selection = market?.selections.find((s) => s.id === selectionId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/legs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roundId, competitionId, fixtureId, marketType, selectionId }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to submit leg");
      return;
    }

    onSubmitted();
  }

  if (loadingCompetitions) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted">
        Loading competitions...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">Submit your leg</h3>
        {competitionId && (
          <span className="rounded-full bg-accent-muted px-2 py-0.5 text-xs text-accent">
            {source === "live" ? "Live odds" : "Demo odds"}
          </span>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">1. Pick a competition</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {competitions.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCompetitionId(c.id);
                setFixtureId("");
                setMarketType("");
                setSelectionId("");
              }}
              className={`rounded-lg border px-3 py-3 text-left text-sm transition-colors ${
                competitionId === c.id
                  ? "border-accent bg-accent-muted/30"
                  : "border-border hover:border-accent/40"
              }`}
            >
              <p className="font-medium">{c.name}</p>
            </button>
          ))}
        </div>
      </div>

      {competitionId && loadingFixtures && (
        <p className="text-sm text-muted">Loading fixtures...</p>
      )}

      {competitionId && !loadingFixtures && fixtures.length === 0 && (
        <p className="text-sm text-muted">
          No upcoming fixtures for this competition right now. Try another competition.
        </p>
      )}

      {competitionId && !loadingFixtures && fixtures.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">2. Pick a fixture</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {fixtures.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setFixtureId(f.id);
                  setMarketType("");
                  setSelectionId("");
                }}
                className={`rounded-lg border px-3 py-3 text-left text-sm transition-colors ${
                  fixtureId === f.id
                    ? "border-accent bg-accent-muted/30"
                    : "border-border hover:border-accent/40"
                }`}
              >
                <p className="font-medium">
                  {f.homeTeam} vs {f.awayTeam}
                </p>
                <p className="mt-1 text-xs text-muted">{formatKickoff(f.kickoff)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {fixture && (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">3. Pick a market</p>
          {loadingMarkets && (
            <p className="text-sm text-muted">Loading BTTS, double chance & more...</p>
          )}
          {marketsError && (
            <p className="text-sm text-amber-400">{marketsError}</p>
          )}
          {marketGroups.map((group) => (
            <div key={group.id} className="space-y-2">
              <p className="text-xs font-medium text-muted">{group.label}</p>
              <div className="flex flex-wrap gap-2">
                {group.markets.map((m) => (
                  <button
                    key={m.type}
                    type="button"
                    onClick={() => {
                      setMarketType(m.type);
                      setSelectionId("");
                    }}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      marketType === m.type
                        ? "border-accent bg-accent-muted/30"
                        : "border-border hover:border-accent/40"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {market && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">4. Pick your selection</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {market.selections.map((s) => {
              const top = sortQuotesByBestOdds(s.odds)[0];
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectionId(s.id)}
                  className={`rounded-lg border px-3 py-3 text-sm ${
                    selectionId === s.id
                      ? "border-accent bg-accent-muted/30"
                      : "border-border hover:border-accent/40"
                  }`}
                >
                  <p className="font-medium">{s.label}</p>
                  {top && <p className="mt-1 text-accent">Best {top.odds}</p>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selection && (
        <p className="text-sm text-muted">
          You&apos;ll submit at the best available odds (
          {sortQuotesByBestOdds(selection.odds)[0]?.odds ?? "—"}). The group acca
          bookmaker is chosen when all legs are in.
        </p>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading || !selectionId}
        className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-black hover:bg-green-400 disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit leg"}
      </button>
    </form>
  );
}

export function AccaSummary({
  combinedOdds,
  bookmakerName,
  bookmakerId,
  singleBookmaker,
  bookmakerRankings = [],
  betslipLink,
}: {
  combinedOdds: number;
  bookmakerName?: string | null;
  bookmakerId?: string | null;
  singleBookmaker: boolean;
  bookmakerRankings?: AccaBookmakerRanking[];
  betslipLink?: string | null;
}) {
  const [bookmakersOpen, setBookmakersOpen] = useState(false);
  const topBookmaker = bookmakerRankings[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent-muted/20 px-4 py-3 text-sm">
        <div>
          <p className="font-semibold">Combined odds</p>
          <p className="text-2xl font-bold text-accent">{combinedOdds}</p>
          {singleBookmaker && bookmakerName && (
            <p className="mt-0.5 text-xs text-muted">Best at {bookmakerName}</p>
          )}
          {!singleBookmaker && (
            <p className="mt-0.5 text-xs text-amber-400">Place legs individually</p>
          )}
        </div>
        {betslipLink && (
          <a
            href={betslipLink}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-black hover:bg-green-400"
          >
            Open betslip
            {topBookmaker ? ` · ${topBookmaker.bookmakerName}` : ""}
          </a>
        )}
      </div>

      {bookmakerRankings.length > 0 && (
        <div className="rounded-xl border border-border bg-card text-sm">
          <button
            type="button"
            onClick={() => setBookmakersOpen((o) => !o)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="font-medium">
              Compare bookmakers
              <span className="ml-2 text-muted">({bookmakerRankings.length})</span>
            </span>
            <span className="text-muted">{bookmakersOpen ? "▲" : "▼"}</span>
          </button>
          {bookmakersOpen && (
            <ol className="space-y-1 border-t border-border px-2 py-2">
              {bookmakerRankings.map((entry, index) => (
                <li
                  key={entry.bookmakerId}
                  className={`flex items-center justify-between gap-2 rounded-lg px-2 py-2 ${
                    index === 0 ? "bg-accent-muted/20" : ""
                  }`}
                >
                  <span>
                    <span className="text-muted">#{index + 1}</span>{" "}
                    <span className="font-medium">{entry.bookmakerName}</span>
                    {entry.hasAllLegLinks === false && entry.url && (
                      <span className="ml-1 text-xs text-amber-400">partial</span>
                    )}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={index === 0 ? "font-semibold text-accent" : ""}>
                      {entry.combinedOdds}
                    </span>
                    {entry.url && (
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded border border-accent/50 px-2 py-0.5 text-xs font-medium text-accent hover:bg-accent-muted/30"
                      >
                        Open
                      </a>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {singleBookmaker && bookmakerId && !betslipLink && (
        <p className="text-xs text-muted">
          Leg odds are priced at {bookmakerName ?? bookmakerId} for this acca.
        </p>
      )}
    </div>
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
  const [autoLoading, setAutoLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoMessage, setAutoMessage] = useState("");

  async function handleAutoSettle() {
    setAutoLoading(true);
    setError("");
    setAutoMessage("");

    const res = await fetch(`/api/rounds/${round.id}/auto-settle`, { method: "POST" });
    const data = await res.json();
    setAutoLoading(false);

    if (!res.ok) {
      if (res.status === 409 && data.resolved) {
        setOutcomes((prev) => ({ ...prev, ...data.resolved }));
        setAutoMessage("Some legs are not ready yet — partial results applied below.");
      }
      setError(data.error ?? "Auto-settle failed");
      return;
    }

    onSettled();
  }

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
      <p className="text-sm text-muted">
        Auto-settle uses synced match results. If legs are pending, run match sync or wait for the next cron run.
      </p>
      <button
        type="button"
        onClick={handleAutoSettle}
        disabled={autoLoading || loading}
        className="w-full rounded-lg bg-accent py-2 text-sm font-medium text-black hover:bg-green-400 disabled:opacity-50"
      >
        {autoLoading ? "Fetching results..." : "Auto-settle from results"}
      </button>
      {autoMessage && <p className="text-sm text-muted">{autoMessage}</p>}
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

export function LegsList({
  legs,
  legLinks,
  showOpenLinks = false,
}: {
  legs: Leg[];
  legLinks?: { legId: string; url: string | null }[];
  showOpenLinks?: boolean;
}) {
  if (legs.length === 0) {
    return <p className="text-sm text-muted">No legs submitted yet.</p>;
  }

  const linkByLegId = new Map(
    (legLinks ?? []).filter((l) => l.url).map((l) => [l.legId, l.url!])
  );

  return (
    <ul className="space-y-2">
      {legs.map((leg) => {
        const openUrl = showOpenLinks ? linkByLegId.get(leg.id) : undefined;
        return (
          <li
            key={leg.id}
            className="rounded-lg border border-border bg-card px-4 py-3 text-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{leg.user.name}</span>
                  <span className="shrink-0 text-accent">{leg.odds}</span>
                </div>
                <p className="text-muted">
                  {leg.homeTeam} vs {leg.awayTeam} · {leg.marketLabel}:{" "}
                  {leg.selectionLabel}
                </p>
                <p className="text-xs text-muted">
                  {leg.competition}
                  {leg.outcome !== "pending" && (
                    <>
                      {" "}
                      · {leg.outcome} (
                      {formatLegPoints(
                        legPointsForOutcome(
                          leg.outcome as "won" | "lost" | "void",
                          leg.odds
                        )
                      )}{" "}
                      pts)
                    </>
                  )}
                </p>
              </div>
              {openUrl && (
                <a
                  href={openUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded border border-accent/50 px-2 py-1 text-xs font-medium text-accent hover:bg-accent-muted/30"
                >
                  Open
                </a>
              )}
            </div>
          </li>
        );
      })}
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
          <span className="font-semibold text-accent">{formatLegPoints(entry.points)} pts</span>
        </li>
      ))}
    </ol>
  );
}

export function RoundHistory({
  rounds,
}: {
  rounds: {
    id: string;
    status: string;
    combinedOdds: number | null;
    profitLossGbp: number | null;
    legs: { selectionLabel: string; outcome: string }[];
  }[];
}) {
  if (rounds.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">Recent rounds</h2>
      <ul className="mt-4 space-y-3">
        {rounds.map((round) => (
          <li key={round.id} className="rounded-xl border border-border bg-card p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted capitalize">{round.status}</span>
              {round.combinedOdds && (
                <span className="text-accent">Combined {round.combinedOdds}</span>
              )}
            </div>
            {round.profitLossGbp != null && (
              <p className="mt-1">P/L: £{round.profitLossGbp.toFixed(2)}</p>
            )}
            <p className="mt-2 text-xs text-muted">
              {round.legs.map((l) => `${l.selectionLabel} (${l.outcome})`).join(" · ")}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
