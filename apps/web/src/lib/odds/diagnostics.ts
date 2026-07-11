import {
  formatCommenceTimeFrom,
  isOddsApiConfigured,
  ODDS_QUOTA_BLOCK_CACHE_KEY,
  oddsApiRegions,
  oddsCacheTtlMs,
} from "@/lib/odds/config";
import { getCached } from "@/lib/odds/cache";
import { isRetailBookmaker } from "@/lib/odds/bookmakers";
import { isQuotaExhaustedError, OddsApiError } from "@/lib/odds/errors";
import { readBulkFixtures } from "@/lib/odds/odds-store";
import {
  fetchOddsApiEventsRaw,
  mapOddsEventToFixture,
} from "@/lib/odds/the-odds-api";
import { getOddsApiQuotaSnapshot } from "@/lib/odds/quota-snapshot";
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
  quotaBlocked: boolean;
  probed: boolean;
  quota: {
    requestsRemaining: string | null;
    requestsUsed: string | null;
    lastRecordedAt: string | null;
    source: "probe" | "snapshot" | "none";
  };
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

function isQuotaErrorMessage(message: string | null): boolean {
  return Boolean(message?.includes("OUT_OF_USAGE_CREDITS"));
}

export async function runOddsDiagnostics(
  competitionId: string,
  options?: { probe?: boolean }
): Promise<OddsDiagnosticsResult> {
  const competition = getCompetitionById(competitionId);
  if (!competition) {
    throw new Error("Unknown competition");
  }

  const regions = oddsApiRegions();
  const cacheTtlMs = oddsCacheTtlMs();
  const dbSnapshot = await readBulkFixtures(competitionId, { allowStale: true });
  const cacheMeta = dbSnapshot
    ? {
        hit: !dbSnapshot.meta.stale,
        remainingMs: Math.max(0, dbSnapshot.meta.expiresAt.getTime() - Date.now()),
      }
    : { hit: false, remainingMs: null };
  const cachedFixtureCount = dbSnapshot?.fixtures.length ?? null;
  const now = Date.now();
  const oddsConfigured = isOddsApiConfigured();
  const quotaBlocked = Boolean(getCached<boolean>(ODDS_QUOTA_BLOCK_CACHE_KEY));
  const probed = options?.probe === true;
  const snapshot = getOddsApiQuotaSnapshot();

  const base: OddsDiagnosticsResult = {
    checkedAt: new Date().toISOString(),
    competitionId,
    competitionName: competition.name,
    oddsConfigured,
    quotaBlocked,
    probed,
    quota: {
      requestsRemaining: snapshot?.requestsRemaining ?? null,
      requestsUsed: snapshot?.requestsUsed ?? null,
      lastRecordedAt: snapshot?.recordedAt ?? null,
      source: snapshot ? "snapshot" : "none",
    },
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
      usedCommenceTimeFrom: false,
    },
    counts: {
      rawEvents: 0,
      withRetailBookmakers: 0,
      mappedToFixtures: 0,
      afterKickoffFilter: cachedFixtureCount ?? 0,
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

  if (quotaBlocked) {
    base.interpretation.push(
      "The Odds API monthly quota is exhausted. Fixture fetches are paused for 15 minutes to avoid wasting calls. Upgrade or wait for your plan to reset at https://the-odds-api.com"
    );
    if (!probed) {
      base.interpretation.push(
        "This page loaded from cache metadata only. Use “Probe API” when you have credits again — each probe costs API quota."
      );
    }
    if (!probed) return base;
  }

  if (!probed) {
    base.interpretation = buildCacheOnlyInterpretation(base);
    return base;
  }

  try {
    const commenceTimeFrom = formatCommenceTimeFrom();
    const { events, status, headers } = await fetchOddsApiEventsRaw(competition.oddsApiSport, {
      commenceTimeFrom,
    });

    base.api = {
      ok: true,
      status,
      error: null,
      requestsRemaining: headers.get("x-requests-remaining"),
      requestsUsed: headers.get("x-requests-used"),
      usedCommenceTimeFrom: true,
    };
    base.quota = {
      requestsRemaining: base.api.requestsRemaining,
      requestsUsed: base.api.requestsUsed,
      lastRecordedAt: new Date().toISOString(),
      source: "probe",
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
    const status = err instanceof OddsApiError ? err.status : null;
    base.api = {
      ok: false,
      status,
      error: err instanceof Error ? err.message : "Odds API request failed",
      requestsRemaining: null,
      requestsUsed: null,
      usedCommenceTimeFrom: true,
    };
    base.interpretation = buildInterpretation(base, err);
    return base;
  }
}

function buildCacheOnlyInterpretation(result: OddsDiagnosticsResult): string[] {
  const lines: string[] = [
    "Loaded cache metadata only — no API call made (saves quota).",
  ];

  if (result.cache.hit && (result.cache.cachedFixtureCount ?? 0) > 0) {
    lines.push(
      `${result.cache.cachedFixtureCount} fixture(s) are stored in the odds DB snapshot and should be served to users until it expires.`
    );
  } else if (result.cache.hit) {
    lines.push("DB snapshot exists but is empty — run the warm-odds-cache cron or wait for the next refresh.");
  } else {
    lines.push(
      "No odds DB snapshot for this competition. Schedule POST /api/internal/warm-odds-cache or enable live fallback locally."
    );
  }

  lines.push(
    "Each bulk odds fetch uses several API credits (h2h + totals + spreads × UK region). Per-fixture market loads cost extra."
  );

  return lines;
}

function buildInterpretation(result: OddsDiagnosticsResult, err?: unknown): string[] {
  const lines: string[] = [];

  if (!result.oddsConfigured) return lines;

  if (!result.api.ok) {
    if (isQuotaExhaustedError(err) || isQuotaErrorMessage(result.api.error)) {
      lines.push(
        "The Odds API monthly quota is exhausted (OUT_OF_USAGE_CREDITS). Upgrade your plan or wait for the monthly reset at https://the-odds-api.com"
      );
      lines.push(
        "The app will stop calling the API for 15 minutes after this error to avoid burning more credits."
      );
    } else if (result.api.status === 401) {
      lines.push("The Odds API rejected the key (401). Check ODDS_API_KEY in GitHub secrets / Cloud Run.");
    } else if (result.api.status === 429) {
      lines.push("The Odds API rate limit hit (429). Wait and retry.");
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
      `${result.counts.afterKickoffFilter} upcoming fixture(s) should appear in the leg picker. DB snapshot TTL is ${Math.round(result.cacheTtlMs / 60_000)} minutes.`
    );
  }

  if (result.cache.hit && result.cache.cachedFixtureCount === 0) {
    lines.push("Odds DB snapshot currently holds an empty fixture list for this competition.");
  }

  return lines;
}
