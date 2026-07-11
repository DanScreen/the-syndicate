import type { Fixture, Market } from "@the-syndicate/shared";
import { filterUpcomingFixtures, getCompetitionById } from "@the-syndicate/shared";
import { isOddsApiConfigured, isProductionRuntime, oddsDbOnly } from "./config";
import { getMockFixtures } from "./mock-provider";
import {
  readBulkFixtures,
  readEventMarkets,
  refreshBulkFixturesFromApi,
  refreshEventMarketsFromApi,
} from "./odds-store";
import { tierForMarketType, type MarketTierId } from "./market-tiers";

export type OddsSource = "live" | "mock";

export async function getFixtures(
  competitionId: string
): Promise<{ fixtures: Fixture[]; source: OddsSource; oddsConfigured: boolean }> {
  const competition = getCompetitionById(competitionId);
  const oddsConfigured = isOddsApiConfigured();

  if (!competition) {
    return { fixtures: [], source: "live", oddsConfigured };
  }

  if (oddsConfigured) {
    try {
      let snapshot = await readBulkFixtures(competitionId);
      if (!snapshot && !oddsDbOnly()) {
        const fixtures = await refreshBulkFixturesFromApi(competitionId);
        return { fixtures, source: "live", oddsConfigured: true };
      }
      if (snapshot) {
        return {
          fixtures: filterUpcomingFixtures(snapshot.fixtures),
          source: "live",
          oddsConfigured: true,
        };
      }
      return { fixtures: [], source: "live", oddsConfigured: true };
    } catch (err) {
      console.error("[odds] live fetch failed:", err);
      return { fixtures: [], source: "live", oddsConfigured: true };
    }
  }

  if (isProductionRuntime()) {
    console.error("[odds] ODDS_API_KEY is not configured in production");
    return { fixtures: [], source: "live", oddsConfigured: false };
  }

  console.warn("[odds] ODDS_API_KEY not set — using local demo fixtures");
  return {
    fixtures: filterUpcomingFixtures(getMockFixtures(competitionId)),
    source: "mock",
    oddsConfigured: false,
  };
}

export async function findFixture(
  fixtureId: string,
  competitionId: string
): Promise<Fixture | undefined> {
  const { fixtures } = await getFixtures(competitionId);
  return fixtures.find((f) => f.id === fixtureId);
}

async function loadExtendedMarkets(
  fixtureId: string,
  competitionId: string,
  tierId: MarketTierId
): Promise<Market[]> {
  if (!isOddsApiConfigured()) return [];

  let snapshot = await readEventMarkets(competitionId, fixtureId, tierId);
  if (!snapshot && !oddsDbOnly()) {
    return refreshEventMarketsFromApi(competitionId, fixtureId, tierId);
  }
  return snapshot?.markets ?? [];
}

export async function getExtendedMarketsForTier(
  fixtureId: string,
  competitionId: string,
  tierId: MarketTierId
): Promise<Market[]> {
  const fixture = await findFixture(fixtureId, competitionId);
  if (!fixture) return [];

  const baseTypes = new Set(fixture.markets.map((m) => m.type));
  const extended = await loadExtendedMarkets(fixtureId, competitionId, tierId);
  return extended.filter((m) => !baseTypes.has(m.type));
}

export async function getFixtureMarkets(
  fixtureId: string,
  competitionId: string,
  tierId: MarketTierId = "core"
): Promise<Market[]> {
  const fixture = await findFixture(fixtureId, competitionId);
  if (!fixture) return [];

  const baseTypes = new Set(fixture.markets.map((m) => m.type));
  const extended = await loadExtendedMarkets(fixtureId, competitionId, tierId);
  const extra = extended.filter((m) => !baseTypes.has(m.type));
  return [...fixture.markets, ...extra];
}

export async function findSelection(
  fixtureId: string,
  marketType: string,
  selectionId: string,
  competitionId: string
) {
  const tierId = tierForMarketType(marketType);
  const markets = await getFixtureMarkets(fixtureId, competitionId, tierId);
  const fixture = await findFixture(fixtureId, competitionId);
  if (!fixture) return null;

  const market = markets.find((m) => m.type === marketType);
  if (!market) return null;
  const selection = market.selections.find((s) => s.id === selectionId);
  if (!selection) return null;
  return { fixture, market, selection };
}
