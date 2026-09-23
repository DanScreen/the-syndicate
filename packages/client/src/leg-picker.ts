import {
  copy,
  groupMarkets,
  isFixtureTaken,
  mergeFixtureMarkets,
  type CompetitionOption,
  type CompetitionsResponse,
  type EditLegInput,
  type Fixture,
  type FixtureMarketsResponse,
  type FixturesResponse,
  type MarketConflictLeg,
  type Market,
  type MarketTierOption,
  type SubmitLegInput,
} from "@tiki-acca/shared";
import { useEffect, useMemo, useState } from "react";
import { ApiError, type ApiFetcher } from "./api";

function marketsPath(fixtureId: string, competitionId: string, tier: string) {
  return `/api/fixtures/${encodeURIComponent(fixtureId)}/markets?competition=${encodeURIComponent(
    competitionId
  )}&tier=${encodeURIComponent(tier)}`;
}

/**
 * The four-step leg picker (competition → fixture → market → selection) and
 * its submit / change call. Each app renders the steps its own way.
 */
export function useLegPicker({
  fetcher,
  roundId,
  editLegId,
  existingLegs = [],
  onSubmitted,
}: {
  fetcher: ApiFetcher;
  roundId: string;
  /** Change this leg (PATCH) instead of adding a new one. */
  editLegId?: string;
  /** Other legs already on the round — used to block occupied fixtures. */
  existingLegs?: MarketConflictLeg[];
  onSubmitted: () => void;
}) {
  const [competitions, setCompetitions] = useState<CompetitionOption[]>([]);
  const [loadingCompetitions, setLoadingCompetitions] = useState(true);
  const [competitionId, setCompetitionId] = useState("");
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [source, setSource] = useState<"live" | "mock">("live");
  const [oddsConfigured, setOddsConfigured] = useState(true);
  const [loadingFixtures, setLoadingFixtures] = useState(false);
  const [fixtureId, setFixtureId] = useState("");
  const [fixtureMarkets, setFixtureMarkets] = useState<Market[]>([]);
  const [loadedTiers, setLoadedTiers] = useState<string[]>([]);
  const [availableTiers, setAvailableTiers] = useState<MarketTierOption[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const [loadingTierId, setLoadingTierId] = useState("");
  const [marketType, setMarketType] = useState("");
  const [selectionId, setSelectionId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [marketsError, setMarketsError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetcher<CompetitionsResponse>("/api/competitions")
      .then((d) => {
        if (cancelled) return;
        setCompetitions(d.competitions);
        if (d.competitions.length === 1) setCompetitionId(d.competitions[0]!.id);
      })
      .catch(() => {
        if (!cancelled) setCompetitions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCompetitions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher]);

  useEffect(() => {
    setFixtureId("");
    setMarketType("");
    setSelectionId("");
    if (!competitionId) {
      setFixtures([]);
      return;
    }
    let cancelled = false;
    setLoadingFixtures(true);
    fetcher<FixturesResponse>(`/api/fixtures?competition=${encodeURIComponent(competitionId)}`)
      .then((d) => {
        if (cancelled) return;
        setFixtures(d.fixtures ?? []);
        setSource(d.source === "mock" ? "mock" : "live");
        setOddsConfigured(d.oddsConfigured !== false);
      })
      .catch(() => {
        if (!cancelled) setFixtures([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingFixtures(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher, competitionId]);

  useEffect(() => {
    setMarketType("");
    setSelectionId("");
    setFixtureMarkets([]);
    setLoadedTiers([]);
    setAvailableTiers([]);
    setMarketsError("");
    if (!fixtureId || !competitionId) return;
    let cancelled = false;
    setLoadingMarkets(true);
    fetcher<FixtureMarketsResponse>(marketsPath(fixtureId, competitionId, "core"))
      .then((d) => {
        if (cancelled) return;
        setFixtureMarkets(d.markets ?? []);
        setLoadedTiers(["core"]);
        setAvailableTiers(d.tiers ?? []);
      })
      .catch((caught) => {
        if (cancelled) return;
        setMarketsError(
          caught instanceof ApiError ? caught.message : copy.legPicker.marketsError
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingMarkets(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher, fixtureId, competitionId]);

  async function loadMarketTier(tierId: string) {
    if (!fixtureId || !competitionId || loadedTiers.includes(tierId)) return;
    setLoadingTierId(tierId);
    setMarketsError("");
    try {
      const data = await fetcher<FixtureMarketsResponse>(
        marketsPath(fixtureId, competitionId, tierId)
      );
      const markets = data.markets ?? [];
      setFixtureMarkets((prev) => mergeFixtureMarkets(prev, markets));
      setLoadedTiers((prev) => [...prev, tierId]);
      if (markets.length === 0) {
        const label = availableTiers.find((t) => t.id === tierId)?.label ?? "Those markets";
        setMarketsError(copy.legPicker.marketsEmptyTier(label));
      }
    } catch (caught) {
      setMarketsError(caught instanceof ApiError ? caught.message : copy.legPicker.marketsError);
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
  const hasTakenFixtures = fixtures.some((f) => isFixtureTaken(existingLegs, f.id, editLegId));
  const unloadedTiers = availableTiers.filter((t) => !loadedTiers.includes(t.id));

  /** Back to the start for the next leg (keeps a lone competition selected). */
  function reset() {
    setFixtureId("");
    setError("");
    setCompetitionId(competitions.length === 1 ? competitions[0]!.id : "");
  }

  /** Submit (or change) the selected leg. Resolves true on success. */
  async function submit(): Promise<boolean> {
    if (!competitionId || !fixtureId || !marketType || !selectionId || submitting) return false;
    setSubmitting(true);
    setError("");
    try {
      if (editLegId) {
        const body: EditLegInput = { competitionId, fixtureId, marketType, selectionId };
        await fetcher(`/api/legs/${encodeURIComponent(editLegId)}`, { method: "PATCH", body });
      } else {
        const body: SubmitLegInput = { roundId, competitionId, fixtureId, marketType, selectionId };
        await fetcher("/api/legs", { method: "POST", body });
        reset();
      }
      onSubmitted();
      return true;
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : editLegId
            ? "Failed to update leg"
            : "Failed to submit leg"
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  return {
    competitions,
    loadingCompetitions,
    competitionId,
    setCompetitionId,
    competition,
    fixtures,
    source,
    oddsConfigured,
    loadingFixtures,
    fixtureId,
    setFixtureId,
    fixture,
    hasTakenFixtures,
    loadingMarkets,
    marketsError,
    availableTiers,
    unloadedTiers,
    loadingTierId,
    loadMarketTier,
    allMarkets,
    marketGroups,
    marketType,
    setMarketType,
    market,
    selectionId,
    setSelectionId,
    selection,
    submitting,
    error,
    submit,
    reset,
  };
}

export type LegPicker = ReturnType<typeof useLegPicker>;
