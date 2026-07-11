import type { Fixture } from "@the-syndicate/shared";
import { getEnabledCompetitions } from "@/lib/competitions/settings";
import { isOddsApiConfigured, oddsWarmCoreWithinHours } from "./config";
import { MARKET_TIER_IDS, type MarketTierId } from "./market-tiers";
import {
  deleteExpiredOddsSnapshots,
  readBulkFixtures,
  refreshBulkFixturesFromApi,
  refreshEventMarketsFromApi,
} from "./odds-store";

export type WarmOddsCacheResult = {
  competitions: {
    competitionId: string;
    bulk: { ok: boolean; fixtureCount: number; error?: string };
    core: { warmed: number; skipped: number; errors: string[] };
  }[];
  cleanup: { bulkDeleted: number; eventDeleted: number };
};

function fixturesWithinHours(fixtures: Fixture[], hours: number): Fixture[] {
  const cutoff = Date.now() + hours * 60 * 60 * 1000;
  return fixtures.filter((f) => {
    const kickoff = new Date(f.kickoff).getTime();
    return kickoff > Date.now() && kickoff <= cutoff;
  });
}

export async function warmOddsCache(options?: {
  tiers?: MarketTierId[];
  coreWithinHours?: number;
}): Promise<WarmOddsCacheResult> {
  if (!isOddsApiConfigured()) {
    throw new Error("ODDS_API_KEY is not configured");
  }

  const tiers = options?.tiers ?? (["core"] as MarketTierId[]);
  const coreWithinHours = options?.coreWithinHours ?? oddsWarmCoreWithinHours();
  const enabled = await getEnabledCompetitions();
  const cleanup = await deleteExpiredOddsSnapshots();

  const competitions: WarmOddsCacheResult["competitions"] = [];

  for (const competition of enabled) {
    const entry: WarmOddsCacheResult["competitions"][number] = {
      competitionId: competition.id,
      bulk: { ok: false, fixtureCount: 0 },
      core: { warmed: 0, skipped: 0, errors: [] },
    };

    try {
      const fixtures = await refreshBulkFixturesFromApi(competition.id);
      entry.bulk = { ok: true, fixtureCount: fixtures.length };
    } catch (err) {
      entry.bulk = {
        ok: false,
        fixtureCount: 0,
        error: err instanceof Error ? err.message : String(err),
      };
      competitions.push(entry);
      continue;
    }

    if (!tiers.includes("core")) {
      competitions.push(entry);
      continue;
    }

    const snapshot = await readBulkFixtures(competition.id, { allowStale: false });
    const fixtures = snapshot?.fixtures ?? [];
    const upcoming = fixturesWithinHours(fixtures, coreWithinHours);

    for (const fixture of upcoming) {
      try {
        await refreshEventMarketsFromApi(competition.id, fixture.id, "core");
        entry.core.warmed += 1;
      } catch (err) {
        entry.core.errors.push(
          `${fixture.id}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    entry.core.skipped = fixtures.length - upcoming.length;
    competitions.push(entry);
  }

  return { competitions, cleanup };
}
