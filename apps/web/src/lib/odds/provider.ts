import type { Fixture, Market } from "@the-syndicate/shared";
import { filterUpcomingFixtures, getCompetitionById } from "@the-syndicate/shared";
import { getMockFixtures } from "./mock-provider";
import { fetchExtendedMarkets } from "./event-markets";
import { fetchOddsApiFixtures } from "./the-odds-api";

export type OddsSource = "live" | "mock";

export async function getFixtures(
  competitionId: string
): Promise<{ fixtures: Fixture[]; source: OddsSource }> {
  const competition = getCompetitionById(competitionId);
  if (!competition) {
    return { fixtures: [], source: "mock" };
  }

  if (process.env.ODDS_API_KEY) {
    try {
      const fixtures = await fetchOddsApiFixtures(competition.oddsApiSport, competition.name);
      return { fixtures, source: "live" };
    } catch (err) {
      console.error("[odds] live fetch failed:", err);
      return { fixtures: [], source: "live" };
    }
  }

  console.warn("[odds] ODDS_API_KEY not set, using mock fixtures");
  return {
    fixtures: filterUpcomingFixtures(getMockFixtures(competitionId)),
    source: "mock",
  };
}

export async function findFixture(
  fixtureId: string,
  competitionId: string
): Promise<Fixture | undefined> {
  const { fixtures } = await getFixtures(competitionId);
  return fixtures.find((f) => f.id === fixtureId);
}

export async function getFixtureMarkets(
  fixtureId: string,
  competitionId: string
): Promise<Market[]> {
  const competition = getCompetitionById(competitionId);
  const fixture = await findFixture(fixtureId, competitionId);
  if (!fixture) return [];

  const baseTypes = new Set(fixture.markets.map((m) => m.type));

  if (process.env.ODDS_API_KEY && competition) {
    try {
      const extended = await fetchExtendedMarkets(fixtureId, competition.oddsApiSport);
      const extra = extended.filter((m) => !baseTypes.has(m.type));
      return [...fixture.markets, ...extra];
    } catch (err) {
      console.error("[odds] extended markets fetch failed:", err);
    }
  }

  return fixture.markets;
}

export async function findSelection(
  fixtureId: string,
  marketType: string,
  selectionId: string,
  competitionId: string
) {
  const markets = await getFixtureMarkets(fixtureId, competitionId);
  const fixture = await findFixture(fixtureId, competitionId);
  if (!fixture) return null;

  const market = markets.find((m) => m.type === marketType);
  if (!market) return null;
  const selection = market.selections.find((s) => s.id === selectionId);
  if (!selection) return null;
  return { fixture, market, selection };
}
