"use client";

import type { Fixture, Market } from "@the-syndicate/shared";
import { formatLegPoints, type AccaBookmakerRanking } from "@the-syndicate/shared";
import {
  BookmakerLogo,
  bookmakerRankBadgeClass,
  bookmakerRankLabel,
  bookmakerRankPlace,
  bookmakerRankRowClass,
} from "@/components/bookmaker-logo";
import { useEffect, useMemo, useState } from "react";
import { sortQuotesByBestOdds } from "@/lib/odds/bookmakers";
import { groupMarkets } from "@/lib/odds/market-groups";
import { MARKET_TIERS } from "@/lib/odds/market-tiers";

type MarketTierInfo = {
  id: string;
  label: string;
  description: string;
};

const MARKET_TIER_OPTIONS: MarketTierInfo[] = MARKET_TIERS.map((tier) => ({
  id: tier.id,
  label: tier.label,
  description: tier.description,
}));

function mergeMarkets(bulk: Market[], extended: Market[]): Market[] {
  const byType = new Map<string, Market>();
  for (const market of bulk) byType.set(market.type, market);
  for (const market of extended) byType.set(market.type, market);
  return [...byType.values()];
}

type Leg = {
  id: string;
  user: { id: string; name: string };
  homeTeam: string;
  awayTeam: string;
  competition: string;
  kickoff: string;
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

export function RoundProgress({
  members,
  legs,
  status,
  firstKickoff,
}: {
  members: Member[];
  legs: Leg[];
  status: string;
  /** Earliest kickoff among submitted legs — acca locks when this match starts. */
  firstKickoff?: Date | null;
}) {
  const submittedIds = new Set(legs.map((l) => l.user.id));
  const pending = members.filter((m) => !submittedIds.has(m.id));

  let banner = "";
  if (status === "open") {
    if (pending.length === 0) {
      banner = "Everyone has submitted — locking acca...";
    } else if (firstKickoff) {
      banner = `Waiting on ${pending.length} leg${pending.length === 1 ? "" : "s"} — acca locks at first kickoff`;
    } else {
      banner = `Waiting on ${pending.length} leg${pending.length === 1 ? "" : "s"}`;
    }
  } else if (status === "locked") {
    banner = "Acca locked — place your bet at the bookmaker";
  } else if (status === "settled") {
    banner = "Round settled";
  }

  return (
    <div className="space-y-3">
      {banner && (
        <div className="rounded-lg border border-accent/30 bg-accent-muted/40 px-4 py-3 text-sm text-accent">
          <p>{banner}</p>
          {status === "open" && firstKickoff && pending.length > 0 ? (
            <p className="mt-1 text-xs text-accent/80">
              Locks {formatKickoff(firstKickoff.toISOString())} — members who
              haven&apos;t picked will miss this acca
            </p>
          ) : null}
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
  editLegId,
  onCancel,
}: {
  roundId: string;
  onSubmitted: () => void;
  /** When set, the form edits this existing leg (PATCH) instead of submitting a new one. */
  editLegId?: string;
  onCancel?: () => void;
}) {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loadingCompetitions, setLoadingCompetitions] = useState(true);
  const [competitionId, setCompetitionId] = useState("");
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [source, setSource] = useState<"live" | "mock">("live");
  const [oddsConfigured, setOddsConfigured] = useState(true);
  const [loadingFixtures, setLoadingFixtures] = useState(false);
  const [fixtureId, setFixtureId] = useState("");
  const [fixtureMarkets, setFixtureMarkets] = useState<Market[]>([]);
  const [loadedTiers, setLoadedTiers] = useState<string[]>([]);
  const [availableTiers, setAvailableTiers] = useState<MarketTierInfo[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const [loadingTierId, setLoadingTierId] = useState("");
  const [marketType, setMarketType] = useState("");
  const [selectionId, setSelectionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [marketsError, setMarketsError] = useState("");

  useEffect(() => {
    fetch("/api/competitions")
      .then((r) => r.json())
      .then((d) => {
        const list = d.competitions ?? [];
        setCompetitions(list);
        if (list.length === 1) {
          setCompetitionId(list[0].id);
        }
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
        setSource(d.source === "mock" ? "mock" : "live");
        setOddsConfigured(d.oddsConfigured !== false);
      })
      .finally(() => setLoadingFixtures(false));
  }, [competitionId]);

  useEffect(() => {
    if (!fixtureId || !competitionId) {
      setFixtureMarkets([]);
      setLoadedTiers([]);
      setAvailableTiers([]);
      return;
    }

    setLoadingMarkets(true);
    setMarketsError("");
    setFixtureMarkets([]);
    setLoadedTiers([]);
    setAvailableTiers(MARKET_TIER_OPTIONS);
    fetch(
      `/api/fixtures/${fixtureId}/markets?competition=${encodeURIComponent(competitionId)}&tier=core`
    )
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setFixtureMarkets([]);
          setMarketsError(d.error ?? "Failed to load extra markets");
          return;
        }
        setFixtureMarkets(d.markets ?? []);
        setLoadedTiers(["core"]);
      })
      .catch(() => {
        setFixtureMarkets([]);
        setMarketsError("Failed to load extra markets");
      })
      .finally(() => setLoadingMarkets(false));
  }, [fixtureId, competitionId]);

  async function loadMarketTier(tierId: string) {
    if (!fixtureId || !competitionId || loadedTiers.includes(tierId)) return;

    setLoadingTierId(tierId);
    setMarketsError("");
    try {
      const res = await fetch(
        `/api/fixtures/${fixtureId}/markets?competition=${encodeURIComponent(competitionId)}&tier=${encodeURIComponent(tierId)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setMarketsError(data.error ?? "Failed to load markets");
        return;
      }
      setFixtureMarkets((prev) => {
        const byType = new Map(prev.map((m) => [m.type, m]));
        for (const market of data.markets ?? []) byType.set(market.type, market);
        return [...byType.values()];
      });
      setLoadedTiers((prev) => [...prev, tierId]);
    } catch {
      setMarketsError("Failed to load markets");
    } finally {
      setLoadingTierId("");
    }
  }

  const fixture = fixtures.find((f) => f.id === fixtureId);
  const allMarkets = useMemo(
    () => mergeMarkets(fixture?.markets ?? [], fixtureMarkets),
    [fixture, fixtureMarkets]
  );
  const marketGroups = useMemo(() => groupMarkets(allMarkets), [allMarkets]);
  const market = allMarkets.find((m) => m.type === marketType);
  const selection = market?.selections.find((s) => s.id === selectionId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = editLegId
      ? await fetch(`/api/legs/${editLegId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ competitionId, fixtureId, marketType, selectionId }),
        })
      : await fetch("/api/legs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roundId, competitionId, fixtureId, marketType, selectionId }),
        });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(
        typeof data.error === "string"
          ? data.error
          : editLegId
            ? "Failed to update leg"
            : "Failed to submit leg"
      );
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

  if (competitions.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted">
        No competitions are available for picks right now. Check back soon.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{editLegId ? "Change your leg" : "Submit your leg"}</h3>
        {competitionId && source === "live" && oddsConfigured && fixtures.length > 0 && (
          <span className="rounded-full bg-accent-muted px-2 py-0.5 text-xs text-accent">
            Live odds
          </span>
        )}
        {competitionId && source === "mock" && (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">
            Local demo
          </span>
        )}
      </div>

      {source === "mock" && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          These are placeholder fixtures for local development only — not real World Cup
          matches. Add <code className="text-amber-50">ODDS_API_KEY</code> to{" "}
          <code className="text-amber-50">apps/web/.env.local</code> for live odds.
        </div>
      )}

      {source === "live" && !oddsConfigured && process.env.NODE_ENV === "development" && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Live odds are not configured locally. Add <code className="text-red-100">ODDS_API_KEY</code> to{" "}
          <code className="text-red-100">apps/web/.env.local</code>.
        </div>
      )}

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
          {source === "mock"
            ? "No demo fixtures available."
            : "No upcoming fixtures with bookmaker odds right now. Try again closer to kickoff."}
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
            <p className="text-sm text-muted">Loading popular markets…</p>
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
          {!loadingMarkets && availableTiers.some((t) => !loadedTiers.includes(t.id)) && (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs font-medium text-muted">Load more markets</p>
              <div className="flex flex-wrap gap-2">
                {availableTiers
                  .filter((t) => !loadedTiers.includes(t.id))
                  .map((tier) => (
                    <button
                      key={tier.id}
                      type="button"
                      disabled={Boolean(loadingTierId)}
                      onClick={() => void loadMarketTier(tier.id)}
                      className="rounded-lg border border-dashed border-border px-3 py-2 text-left text-sm hover:border-accent/40 disabled:opacity-50"
                    >
                      <p className="font-medium">
                        {loadingTierId === tier.id ? "Loading…" : tier.label}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">{tier.description}</p>
                    </button>
                  ))}
              </div>
            </div>
          )}
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
        {loading
          ? editLegId
            ? "Updating..."
            : "Submitting..."
          : editLegId
            ? "Update leg"
            : "Submit leg"}
      </button>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-lg border border-border py-2 text-sm text-muted hover:bg-background"
        >
          Cancel — keep my current pick
        </button>
      )}
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
  inProgress = false,
  preview = false,
  showBookmakerCompare = true,
}: {
  combinedOdds: number;
  bookmakerName?: string | null;
  bookmakerId?: string | null;
  singleBookmaker: boolean;
  bookmakerRankings?: AccaBookmakerRanking[];
  betslipLink?: string | null;
  /** Locked acca — frozen odds copy; outcomes may be in progress. */
  inProgress?: boolean;
  /** Open round — live provisional odds from legs so far. */
  preview?: boolean;
  /** Show ranked bookmaker list. */
  showBookmakerCompare?: boolean;
}) {
  const [bookmakersOpen, setBookmakersOpen] = useState(true);
  const topBookmaker = bookmakerRankings[0];
  const showCompare = showBookmakerCompare && bookmakerRankings.length > 0;
  const oddsLabel = inProgress
    ? "Locked combined odds"
    : preview
      ? "Provisional combined odds"
      : "Combined odds";
  const bookmakerLine = inProgress
    ? `Locked at ${bookmakerName}`
    : preview
      ? `Best so far at ${bookmakerName}`
      : `Best at ${bookmakerName}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent-muted/20 px-4 py-3 text-sm">
        <div>
          <p className="font-semibold">{oddsLabel}</p>
          <p className="text-2xl font-bold text-accent">{combinedOdds}</p>
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
              Live preview from legs submitted so far — final bookmaker locks when the bet closes.
            </p>
          ) : null}
          {!singleBookmaker && !preview && (
            <p className="mt-0.5 text-xs text-amber-400">
              {inProgress ? "Best per-leg odds locked at submission" : "Place legs individually"}
            </p>
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
            {topBookmaker && !inProgress ? ` · ${topBookmaker.bookmakerName}` : ""}
            {inProgress && bookmakerName ? ` · ${bookmakerName}` : ""}
          </a>
        )}
      </div>

      {showCompare && (
        <div className="rounded-xl border border-border bg-card text-sm">
          <button
            type="button"
            onClick={() => setBookmakersOpen((o) => !o)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="font-medium">
              Compare bookmakers
              <span className="ml-2 text-muted">({bookmakerRankings.length})</span>
              {preview ? (
                <span className="ml-2 text-xs font-normal text-muted">provisional</span>
              ) : null}
            </span>
            <span className="text-muted">{bookmakersOpen ? "▲" : "▼"}</span>
          </button>
          {bookmakersOpen && (
            <ol className="space-y-2 border-t border-border px-2 py-2">
              {bookmakerRankings.map((entry, index) => {
                const place = bookmakerRankPlace(index);
                return (
                  <li
                    key={entry.bookmakerId}
                    className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${bookmakerRankRowClass(place)}`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`inline-flex shrink-0 items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${bookmakerRankBadgeClass(place)}`}
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
                        {entry.hasAllLegLinks === false && entry.url ? (
                          <span className="text-xs text-amber-400">Partial deeplink</span>
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
                        {entry.combinedOdds}
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

export function LegsList({
  legs,
  legLinks,
  showOpenLinks = false,
  inProgress = false,
}: {
  legs: Leg[];
  legLinks?: { legId: string; url: string | null }[];
  showOpenLinks?: boolean;
  /** Locked acca awaiting results — show outcomes and frozen leg odds. */
  inProgress?: boolean;
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
        const showOutcome = inProgress || leg.outcome !== "pending";

        return (
          <li
            key={leg.id}
            className={`rounded-lg border px-4 py-3 text-sm ${
              inProgress && leg.outcome !== "pending"
                ? legOutcomeClass(leg.outcome)
                : "border-border bg-card"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{leg.user.name}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    {showOutcome && (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                          inProgress ? legOutcomeClass(leg.outcome) : "border-border text-muted"
                        }`}
                      >
                        {legOutcomeLabel(leg.outcome)}
                      </span>
                    )}
                    <span className="text-accent">{leg.odds}</span>
                  </div>
                </div>
                <p className="text-muted">
                  {leg.homeTeam} vs {leg.awayTeam} · {leg.marketLabel}:{" "}
                  {leg.selectionLabel}
                </p>
                <p className="text-xs text-muted">
                  {leg.competition}
                  {inProgress && (
                    <span> · Locked at {leg.bookmakerName}</span>
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
