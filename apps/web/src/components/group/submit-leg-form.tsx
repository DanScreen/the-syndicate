"use client";

import { useEffect, useMemo, useState } from "react";
import {
  findOutrightMixConflict,
  formatFixtureLabel,
  formatOdds,
  groupMarkets,
  isFixtureTaken,
  isOutrightFixtureId,
  sortQuotesByBestOdds,
  sortQuotesForDisplay,
} from "@tiki-acca/shared";
import type { Fixture, Market, MarketConflictLeg } from "@tiki-acca/shared";
import { MARKET_TIERS } from "@/lib/odds/market-tiers";
import { CheckIcon } from "./round-helpers";
import { formatKickoff } from "@tiki-acca/shared";
import { mergeFixtureMarkets } from "@tiki-acca/shared";

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

type Competition = { id: string; name: string };

export function SubmitLegForm({
  roundId,
  onSubmitted,
  editLegId,
  onCancel,
  title,
  legSlot,
  legsPerMember,
  existingLegs = [],
}: {
  roundId: string;
  onSubmitted: () => void;
  /** When set, the form edits this existing leg (PATCH) instead of submitting a new one. */
  editLegId?: string;
  onCancel?: () => void;
  /** Override default heading (e.g. "Submit leg 2 of 3"). */
  title?: string;
  /** 1-based slot for the leg being submitted (multi-leg rounds). */
  legSlot?: number;
  /** Group quota — used for multi-leg progress copy. */
  legsPerMember?: number;
  /** Other legs already on this round — used to block occupied fixtures. */
  existingLegs?: MarketConflictLeg[];
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
      const markets = (data.markets ?? []) as Market[];
      setFixtureMarkets((prev) => {
        const byType = new Map(prev.map((m) => [m.type, m]));
        for (const market of markets) byType.set(market.type, market);
        return [...byType.values()];
      });
      setLoadedTiers((prev) => [...prev, tierId]);
      if (markets.length === 0) {
        const label =
          availableTiers.find((t) => t.id === tierId)?.label ?? "Those markets";
        setMarketsError(
          `${label} aren't available for this fixture from UK bookmakers right now.`
        );
      }
    } catch {
      setMarketsError("Failed to load markets");
    } finally {
      setLoadingTierId("");
    }
  }

  const competition = competitions.find((c) => c.id === competitionId);
  const fixture = fixtures.find((f) => f.id === fixtureId);
  const allMarkets = useMemo(
    () => mergeFixtureMarkets(fixture?.markets ?? [], fixtureMarkets),
    [fixture, fixtureMarkets]
  );
  const marketGroups = useMemo(() => groupMarkets(allMarkets), [allMarkets]);
  const market = allMarkets.find((m) => m.type === marketType);
  const selection = market?.selections.find((s) => s.id === selectionId);
  const hasTakenFixtures = fixtures.some((f) =>
    isFixtureTaken(existingLegs, f.id, editLegId)
  );

  function resetLegSelection() {
    setFixtureId("");
    setMarketType("");
    setSelectionId("");
    setFixtureMarkets([]);
    setLoadedTiers([]);
    setAvailableTiers([]);
    setMarketsError("");
    setError("");
    if (competitions.length === 1) {
      setCompetitionId(competitions[0]!.id);
    } else {
      setCompetitionId("");
    }
  }

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

    if (!editLegId) {
      resetLegSelection();
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
        <h3 className="font-semibold">
          {title ?? (editLegId ? "Change your leg" : "Submit your leg")}
        </h3>
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

      {!editLegId && legsPerMember != null && legsPerMember > 1 && legSlot != null && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            legSlot > 1
              ? "border-accent/40 bg-accent-muted/30 text-foreground"
              : "border-border bg-background text-muted"
          }`}
        >
          {legSlot === 1
            ? `You'll pick ${legsPerMember} legs from different fixtures — start with leg 1.`
            : `Leg ${legSlot - 1} saved. Pick a different fixture for leg ${legSlot}.`}
        </div>
      )}

      {source === "mock" && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          These are placeholder fixtures for local development only, not real World Cup
          matches. Add <code className="text-amber-50">ODDS_API_KEY</code> to{" "}
          <code className="text-amber-50">apps/web/.env.local</code> for live odds.
        </div>
      )}

      {source === "live" && !oddsConfigured && process.env.NODE_ENV === "development" && (
        <div className="rounded-lg border border-danger-strong/30 bg-danger-strong/10 px-4 py-3 text-sm text-red-200">
          Live odds are not configured locally. Add <code className="text-red-100">ODDS_API_KEY</code> to{" "}
          <code className="text-red-100">apps/web/.env.local</code>.
        </div>
      )}

      {!competitionId && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">1. Pick a competition</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {competitions.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={false}
                onClick={() => {
                  setCompetitionId(c.id);
                  setFixtureId("");
                  setMarketType("");
                  setSelectionId("");
                }}
                className="rounded-lg border border-border px-3 py-3 text-left text-sm transition-colors hover:border-accent/40"
              >
                <p className="font-medium">{c.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {competition && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-accent/40 bg-accent-muted/20 px-3 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              1. Selected competition
            </p>
            <p className="mt-1 text-sm font-medium">{competition.name}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCompetitionId("");
              setFixtureId("");
              setMarketType("");
              setSelectionId("");
            }}
            className="shrink-0 text-sm font-medium text-accent hover:text-accent-bright"
          >
            Change competition
          </button>
        </div>
      )}

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

      {competitionId && !loadingFixtures && fixtures.length > 0 && !fixture && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">2. Pick a fixture</p>
          {hasTakenFixtures && (
            <p className="text-xs text-muted">
              One pick per fixture keeps combined odds accurate.
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {fixtures.map((f) => {
              const taken = isFixtureTaken(existingLegs, f.id, editLegId);
              const mixes = findOutrightMixConflict(existingLegs, f.id, editLegId) !== null;
              const disabled = taken || mixes;
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={false}
                  disabled={disabled}
                  title={
                    taken
                      ? "Another leg from this fixture is already in the acca"
                      : mixes
                        ? "Outrights and match picks can't share an acca"
                        : undefined
                  }
                  onClick={() => {
                    if (disabled) return;
                    setFixtureId(f.id);
                    setMarketType("");
                    setSelectionId("");
                  }}
                  className={`rounded-lg border px-3 py-3 text-left text-sm transition-colors ${
                    disabled
                      ? "cursor-not-allowed border-border/60 text-muted opacity-50"
                      : "border-border hover:border-accent/40"
                  }`}
                >
                  <p className="font-medium">
                    {formatFixtureLabel(f)}
                    {taken ? " (already in acca)" : mixes ? " (not combinable)" : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {isOutrightFixtureId(f.id) ? "Settles at season end" : formatKickoff(f.kickoff)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {fixture && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-accent/40 bg-accent-muted/20 px-3 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              2. Selected fixture
            </p>
            <p className="mt-1 text-sm font-medium">{formatFixtureLabel(fixture)}</p>
            <p className="mt-0.5 text-xs text-muted">
              {isOutrightFixtureId(fixture.id)
                ? "Settles at the end of the season — this acca stays open until then"
                : formatKickoff(fixture.kickoff)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFixtureId("");
              setMarketType("");
              setSelectionId("");
            }}
            className="shrink-0 text-sm font-medium text-accent hover:text-accent-bright"
          >
            Change fixture
          </button>
        </div>
      )}

      {fixture && !market && (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">3. Pick a market</p>
          {loadingMarkets && (
            <p className="text-sm text-muted">Loading popular markets…</p>
          )}
          {marketsError && (
            <p className="text-sm text-warning">{marketsError}</p>
          )}
          {marketGroups.map((group) => (
            <div key={group.id} className="space-y-2">
              <p className="text-xs font-medium text-muted">{group.label}</p>
              <div className="flex flex-wrap gap-2">
                {group.markets.map((m) => (
                  <button
                    key={m.type}
                    type="button"
                    aria-pressed={marketType === m.type}
                    onClick={() => {
                      setMarketType(m.type);
                      setSelectionId("");
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm ${
                      marketType === m.type
                        ? "border-accent bg-accent-muted/30"
                        : "border-border hover:border-accent/40"
                    }`}
                  >
                    {marketType === m.type && <CheckIcon className="text-accent" />}
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
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-accent/40 bg-accent-muted/20 px-3 py-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                3. Selected market
              </p>
              <p className="mt-1 text-sm font-medium">{market.label}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setMarketType("");
                setSelectionId("");
              }}
              className="shrink-0 text-sm font-medium text-accent hover:text-accent-bright"
            >
              Change market
            </button>
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">4. Pick your selection</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {market.selections.map((s) => {
              const top = sortQuotesByBestOdds(s.odds)[0];
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={selectionId === s.id}
                  onClick={() => setSelectionId(s.id)}
                  className={`rounded-lg border px-3 py-3 text-sm ${
                    selectionId === s.id
                      ? "border-accent bg-accent-muted/30"
                      : "border-border hover:border-accent/40"
                  }`}
                >
                  <p className="flex items-center justify-center gap-1.5 font-medium">
                    {selectionId === s.id && <CheckIcon className="text-accent" />}
                    {s.label}
                  </p>
                  {top && <p className="mt-1 text-accent">Best {formatOdds(top.odds)}</p>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selection && (
        <div className="space-y-2">
          <p className="text-sm text-muted">
            You&apos;ll submit at the best available odds (
            {sortQuotesByBestOdds(selection.odds).map((q) => formatOdds(q.odds))[0] ?? "—"}). The group acca
            bookmaker is chosen when all legs are in.
          </p>
          {sortQuotesForDisplay(selection.odds).length > 0 && (
            <ul className="space-y-1 rounded-lg border border-border bg-card px-3 py-2 text-xs">
              {sortQuotesForDisplay(selection.odds).map((q) => (
                <li key={q.bookmakerId} className="flex items-center justify-between gap-2">
                  <span className="truncate">{q.bookmakerName}</span>
                  <span className="tabular-nums">{formatOdds(q.odds)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={loading || !selectionId}
        className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-on-accent hover:bg-accent-bright disabled:opacity-50"
      >
        {loading
          ? editLegId
            ? "Updating…"
            : "Submitting…"
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
