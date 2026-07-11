import type { Fixture, Market } from "@the-syndicate/shared";
import { getCompetitionById } from "@the-syndicate/shared";
import { prisma } from "@the-syndicate/database";
import { oddsCacheTtlMs, oddsApiRegions } from "./config";
import {
  fetchOddsApiFixturesLive,
  fetchOddsApiEventLive,
} from "./the-odds-api";
import { mapEventToExtendedMarkets } from "./event-markets";
import { getMarketTier, type MarketTierId } from "./market-tiers";

export type OddsSnapshotMeta = {
  fetchedAt: Date;
  expiresAt: Date;
  stale: boolean;
};

function expiresAtFromNow(): Date {
  return new Date(Date.now() + oddsCacheTtlMs());
}

function isExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() <= Date.now();
}

export async function readBulkFixtures(
  competitionId: string,
  options?: { allowStale?: boolean }
): Promise<{ fixtures: Fixture[]; meta: OddsSnapshotMeta } | null> {
  const row = await prisma.oddsBulkSnapshot.findUnique({
    where: { competitionId },
  });
  if (!row) return null;

  const stale = isExpired(row.expiresAt);
  if (stale && !options?.allowStale) return null;

  return {
    fixtures: row.fixtures as Fixture[],
    meta: {
      fetchedAt: row.fetchedAt,
      expiresAt: row.expiresAt,
      stale,
    },
  };
}

export async function writeBulkFixtures(
  competitionId: string,
  sport: string,
  regions: string,
  fixtures: Fixture[]
): Promise<void> {
  const expiresAt = expiresAtFromNow();
  await prisma.oddsBulkSnapshot.upsert({
    where: { competitionId },
    create: {
      competitionId,
      sport,
      regions,
      fixtures,
      expiresAt,
    },
    update: {
      sport,
      regions,
      fixtures,
      fetchedAt: new Date(),
      expiresAt,
    },
  });
}

export async function refreshBulkFixturesFromApi(competitionId: string): Promise<Fixture[]> {
  const competition = getCompetitionById(competitionId);
  if (!competition) return [];

  const regions = oddsApiRegions();
  const fixtures = await fetchOddsApiFixturesLive(competition.oddsApiSport, competition.name);
  await writeBulkFixtures(competitionId, competition.oddsApiSport, regions, fixtures);
  return fixtures;
}

export async function readEventMarkets(
  competitionId: string,
  fixtureId: string,
  tierId: MarketTierId,
  options?: { allowStale?: boolean }
): Promise<{ markets: Market[]; meta: OddsSnapshotMeta } | null> {
  const row = await prisma.oddsEventSnapshot.findUnique({
    where: {
      competitionId_fixtureId_tierId: { competitionId, fixtureId, tierId },
    },
  });
  if (!row) return null;

  const stale = isExpired(row.expiresAt);
  if (stale && !options?.allowStale) return null;

  return {
    markets: row.markets as Market[],
    meta: {
      fetchedAt: row.fetchedAt,
      expiresAt: row.expiresAt,
      stale,
    },
  };
}

export async function writeEventMarkets(
  competitionId: string,
  fixtureId: string,
  tierId: MarketTierId,
  markets: Market[]
): Promise<void> {
  const expiresAt = expiresAtFromNow();
  await prisma.oddsEventSnapshot.upsert({
    where: {
      competitionId_fixtureId_tierId: { competitionId, fixtureId, tierId },
    },
    create: {
      competitionId,
      fixtureId,
      tierId,
      markets,
      expiresAt,
    },
    update: {
      markets,
      fetchedAt: new Date(),
      expiresAt,
    },
  });
}

export async function refreshEventMarketsFromApi(
  competitionId: string,
  fixtureId: string,
  tierId: MarketTierId
): Promise<Market[]> {
  const competition = getCompetitionById(competitionId);
  if (!competition) return [];

  const tier = getMarketTier(tierId);
  const event = await fetchOddsApiEventLive(fixtureId, competition.oddsApiSport, {
    markets: tier.marketKeys.join(","),
    regions: tier.regions,
  });
  const markets = event ? mapEventToExtendedMarkets(event, tierId) : [];
  await writeEventMarkets(competitionId, fixtureId, tierId, markets);
  return markets;
}

export async function deleteExpiredOddsSnapshots(): Promise<{
  bulkDeleted: number;
  eventDeleted: number;
}> {
  const now = new Date();
  const [bulk, event] = await Promise.all([
    prisma.oddsBulkSnapshot.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.oddsEventSnapshot.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);
  return { bulkDeleted: bulk.count, eventDeleted: event.count };
}
