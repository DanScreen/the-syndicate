import type { Fixture } from "@the-syndicate/shared";
import { getMockFixtures } from "./mock-provider";
import { fetchOddsApiFixtures } from "./the-odds-api";

export type OddsSource = "live" | "mock";

export async function getFixtures(): Promise<{ fixtures: Fixture[]; source: OddsSource }> {
  if (process.env.ODDS_API_KEY) {
    try {
      const fixtures = await fetchOddsApiFixtures();
      if (fixtures.length > 0) {
        return { fixtures, source: "live" };
      }
      console.warn("[odds] live API returned no fixtures for current sport");
    } catch (err) {
      console.error("[odds] live fetch failed, falling back to mock:", err);
    }
  } else {
    console.warn("[odds] ODDS_API_KEY not set, using mock fixtures");
  }

  return { fixtures: getMockFixtures(), source: "mock" };
}

export async function findFixture(fixtureId: string): Promise<Fixture | undefined> {
  const { fixtures } = await getFixtures();
  return fixtures.find((f) => f.id === fixtureId);
}

export async function findSelection(
  fixtureId: string,
  marketType: string,
  selectionId: string
) {
  const fixture = await findFixture(fixtureId);
  if (!fixture) return null;
  const market = fixture.markets.find((m) => m.type === marketType);
  if (!market) return null;
  const selection = market.selections.find((s) => s.id === selectionId);
  if (!selection) return null;
  return { fixture, market, selection };
}
