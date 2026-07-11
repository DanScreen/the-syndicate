import { isOddsApiConfigured } from "@/lib/odds/config";
import { getCacheMetadata, getCachedFixtureCount } from "@/lib/odds/cache";
import { isRetailBookmaker } from "@/lib/odds/bookmakers";
import {
  fetchOddsApiEventsRaw,
  mapOddsEventToFixture,
  oddsApiCacheKey,
} from "@/lib/odds/the-odds-api";
import { filterUpcomingFixtures, getCompetitionById } from "@the-syndicate/shared";

export type OddsEventSample = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  bookmakerCount: number;
  retailBookmakerCount: number;
  mapped: boolean;
  inFuture: boolean;
  dropReason?: string;
};

export type OddsDiagnosticsResult = {
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
  sampleEvents: OddsEventSample[];
  sampleFixtures: {
    homeTeam: string;
    awayTeam: string;
    kickoff: string;
    marketCount: number;
  }[];
  interpretation: string[];
};

function retailBookmakerCount(event: { bookmakers: { key: string }[] }): number {
  return event.bookmakers.filter((b) => isRetailBookmaker(b.key)).length;
}

function dropReasonForEvent(
  event: { bookmakers: { key: string }[]; commence_time: string },
  mapped: boolean
): string | undefined {
  if (mapped) return undefined;
  if (retailBookmakerCount(event) === 0) {
    return "No retail UK bookmaker odds (h2h/totals/spreads)";
  }
  return "Could not build h2h, totals, or spreads from retail quotes";
}

export async function runOddsDiagnostics(
  competitionId: string,
  options?: { fresh?: boolean }
): Promise<OddsDiagnosticsResult> {
  const competition = getCompetitionById(competitionId);
  if (!competition) {
    throw new Error("Unknown competition");
  }

  const regions = process.env.ODDS_API_REGIONS ?? "uk";
  const cacheTtlMs = Number(process.env.ODDS_API_CACHE_TTL_MS ?? 600_000);
  const cacheKey = oddsApiCacheKey(competition.oddsApiSport, regions);
  const cacheMeta = getCacheMetadata(cacheKey);
  const cachedFixtureCount = getCachedFixtureCount(cacheKey);
  const now = Date.now();
  const oddsConfigured = isOddsApiConfigured();

  const base: OddsDiagnosticsResult = {
    checkedAt: new Date().toISOString(),
    competitionId,
    competitionName: competition.name,
    oddsConfigured,
    sport: competition.oddsApiSport,
    regions,
    cacheTtlMs,
    cache: {
      hit: cacheMeta.hit,
      cachedFixtureCount,
      remainingMs: cacheMeta.remainingMs,
    },
    api: {
      ok: false,
      status: null,
      error: null,
      requestsRemaining: null,
      requestsUsed: null,
      usedCommenceTimeFrom: true,
    },
    counts: {
      rawEvents: 0,
      withRetailBookmakers: 0,
      mappedToFixtures: 0,
      afterKickoffFilter: 0,
    },
    sampleEvents: [],
    sampleFixtures: [],
    interpretation: [],
  };

  if (!oddsConfigured) {
    base.interpretation.push(
      "ODDS_API_KEY is not set — production will show no fixtures; local dev uses demo data."
    );
    return base;
  }

  try {
    const commenceTimeFrom = options?.fresh !== false ? new Date().toISOString() : null;
    const { events, status, headers } = await fetchOddsApiEventsRaw(competition.oddsApiSport, {
      commenceTimeFrom,
    });

    base.api = {
      ok: true,
      status,
      error: null,
      requestsRemaining: headers.get("x-requests-remaining"),
      requestsUsed: headers.get("x-requests-used"),
      usedCommenceTimeFrom: Boolean(commenceTimeFrom),
    };

    const mapped = events.map((event) => {
      const fixture = mapOddsEventToFixture(event);
      const inFuture = new Date(event.commence_time).getTime() > now;
      return { event, fixture, inFuture };
    });

    const fixtures = filterUpcomingFixtures(
      mapped
        .map(({ fixture }) => fixture)
        .filter((fixture): fixture is NonNullable<typeof fixture> => fixture !== null)
        .map((fixture) => ({ ...fixture, competition: competition.name }))
    );

    base.counts = {
      rawEvents: events.length,
      withRetailBookmakers: events.filter((e) => retailBookmakerCount(e) > 0).length,
      mappedToFixtures: mapped.filter((m) => m.fixture !== null).length,
      afterKickoffFilter: fixtures.length,
    };

    base.sampleEvents = mapped.slice(0, 8).map(({ event, fixture, inFuture }) => ({
      id: event.id,
      homeTeam: event.home_team,
      awayTeam: event.away_team,
      kickoff: event.commence_time,
      bookmakerCount: event.bookmakers.length,
      retailBookmakerCount: retailBookmakerCount(event),
      mapped: fixture !== null,
      inFuture,
      dropReason: dropReasonForEvent(event, fixture !== null),
    }));

    base.sampleFixtures = fixtures.slice(0, 8).map((fixture) => ({
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      kickoff: fixture.kickoff,
      marketCount: fixture.markets.length,
    }));

    base.interpretation = buildInterpretation(base);
    return base;
  } catch (err) {
    const status = typeof err === "object" && err && "status" in err ? Number(err.status) : null;
    const body = typeof err === "object" && err && "body" in err ? String(err.body) : null;
    base.api = {
      ok: false,
      status,
      error: err instanceof Error ? err.message : "Odds API request failed",
      requestsRemaining: null,
      requestsUsed: null,
      usedCommenceTimeFrom: true,
    };
    if (body) base.api.error = `${base.api.error} — ${body}`;
    base.interpretation = buildInterpretation(base);
    return base;
  }
}

function buildInterpretation(result: OddsDiagnosticsResult): string[] {
  const lines: string[] = [];

  if (!result.oddsConfigured) return lines;

  if (!result.api.ok) {
    if (result.api.status === 401) {
      lines.push("The Odds API rejected the key (401). Check ODDS_API_KEY in GitHub secrets / Cloud Run.");
    } else if (result.api.status === 429) {
      lines.push("The Odds API quota is exhausted (429). Wait for reset or upgrade the plan.");
    } else {
      lines.push("The Odds API request failed. See the error above.");
    }
    return lines;
  }

  if (result.counts.rawEvents === 0) {
    lines.push(
      "The Odds API returned zero events for this sport/region. Bookmakers may have no upcoming lines posted yet, or the tournament feed is empty."
    );
    return lines;
  }

  if (result.counts.mappedToFixtures === 0) {
    lines.push(
      "Events were returned but none could be mapped to fixtures. Usually means no retail UK h2h/totals/spreads prices on those matches."
    );
  }

  if (result.counts.mappedToFixtures > 0 && result.counts.afterKickoffFilter === 0) {
    lines.push(
      "Fixtures were mapped but all kickoffs are in the past. The commenceTimeFrom filter or kickoff cutoff may be excluding in-play matches."
    );
  }

  if (result.counts.afterKickoffFilter > 0) {
    lines.push(
      `${result.counts.afterKickoffFilter} upcoming fixture(s) should appear in the leg picker. If users still see an empty list, the app cache may be stale — wait for TTL or redeploy.`
    );
  }

  if (result.cache.hit && result.cache.cachedFixtureCount === 0) {
    lines.push(
      "In-memory cache currently holds an empty fixture list for this sport. A fresh deploy or waiting for cache TTL can clear it."
    );
  }

  return lines;
}
