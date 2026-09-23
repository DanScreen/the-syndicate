import {
  isLegOrientationDirect,
  isLegOrientationReversed,
} from "@/lib/results/football-data";
import { isTerminalMatchStatus } from "@/lib/results/result-confirmation";
import { mapFixture, MAPPING_KICKOFF_WINDOW_MS } from "@/lib/results/map-fixture";
import { applyMatchConsensus, recordObservation } from "@/lib/results/observations";
import {
  apiFootballQuota,
  apiFootballReading,
  fetchApiFootballFixturesByDate,
  fetchApiFootballFixturesByIds,
  type ApiFootballFixture,
} from "@/lib/results/providers/api-football";
import { getCompetitionsNeedingResults } from "@/lib/results/sync-matches";
import { loadAliasLookup, recordLearnedAlias } from "@/lib/results/team-alias-store";
import { prisma } from "@tiki-acca/database";

const PROVIDER = "api_football";
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Retry an unmapped match at most hourly (each date lookup is ~1MB). */
export const API_FOOTBALL_MAPPING_RETRY_MS = HOUR_MS;
/** Map matches kicking off from 3 days ago up to 2 days ahead. */
const MAPPING_LOOKBACK_MS = 3 * DAY_MS;
const MAPPING_LOOKAHEAD_MS = 2 * DAY_MS;
/** Poll live from 10 minutes before kickoff until 12 hours after. */
const LIVE_POLL_BEFORE_MS = 10 * 60 * 1000;
const LIVE_POLL_AFTER_MS = 12 * HOUR_MS;
/** After FT keep polling every 15 minutes for 24h (late score / stats corrections). */
const FINISHED_POLL_INTERVAL_MS = 15 * 60 * 1000;
const FINISHED_POLL_WINDOW_MS = DAY_MS;

export type ApiFootballSyncResult = {
  mapped: number;
  unmapped: number;
  ambiguous: number;
  polled: number;
  requests: number;
  scoreChangedMatchIds: string[];
  quotaRemaining: number | null;
  errors: string[];
};

function utcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** UTC dates to search: kickoff day, plus the neighbour when within the window of midnight. */
export function mappingDates(kickoff: Date): string[] {
  const dates = new Set([utcDate(kickoff)]);
  dates.add(utcDate(new Date(kickoff.getTime() - MAPPING_KICKOFF_WINDOW_MS)));
  dates.add(utcDate(new Date(kickoff.getTime() + MAPPING_KICKOFF_WINDOW_MS)));
  return [...dates];
}

/** Should a mapped match be polled on this run? */
export function shouldPollObservation(
  obs: { status: string; observedAt: Date },
  match: { kickoff: Date; finishedAt: Date | null },
  now: Date
): boolean {
  if (!isTerminalMatchStatus(obs.status)) {
    const t = now.getTime();
    return (
      t >= match.kickoff.getTime() - LIVE_POLL_BEFORE_MS &&
      t <= match.kickoff.getTime() + LIVE_POLL_AFTER_MS
    );
  }
  const finishedAt = match.finishedAt ?? obs.observedAt;
  return (
    now.getTime() - finishedAt.getTime() <= FINISHED_POLL_WINDOW_MS &&
    now.getTime() - obs.observedAt.getTime() >= FINISHED_POLL_INTERVAL_MS
  );
}

async function mapUnmappedMatches(
  leagueByCompetition: Map<string, number>,
  now: Date,
  result: ApiFootballSyncResult
): Promise<void> {
  const targets = await prisma.match.findMany({
    where: {
      competitionId: { in: [...leagueByCompetition.keys()] },
      scoreLocked: false,
      kickoff: {
        gte: new Date(now.getTime() - MAPPING_LOOKBACK_MS),
        lte: new Date(now.getTime() + MAPPING_LOOKAHEAD_MS),
      },
      legs: { some: { round: { status: { in: ["locked", "settled"] } } } },
      observations: { none: { provider: PROVIDER } },
      OR: [
        { apiFootballCheckedAt: null },
        { apiFootballCheckedAt: { lt: new Date(now.getTime() - API_FOOTBALL_MAPPING_RETRY_MS) } },
      ],
    },
    include: { legs: { select: { homeTeam: true, awayTeam: true } } },
    orderBy: { kickoff: "asc" },
  });
  if (targets.length === 0) return;

  const aliases = await loadAliasLookup();
  const byDate = new Map<string, ApiFootballFixture[]>();
  async function fixturesOn(date: string): Promise<ApiFootballFixture[]> {
    const cached = byDate.get(date);
    if (cached) return cached;
    result.requests++;
    const fixtures = await fetchApiFootballFixturesByDate(date);
    byDate.set(date, fixtures);
    return fixtures;
  }

  const taken = new Set(
    (
      await prisma.matchObservation.findMany({
        where: { provider: PROVIDER, match: { kickoff: { gte: new Date(now.getTime() - 5 * DAY_MS) } } },
        select: { externalId: true },
      })
    ).map((o) => o.externalId)
  );

  for (const match of targets) {
    const leagueId = leagueByCompetition.get(match.competitionId)!;
    const homeNames = [match.homeTeam];
    const awayNames = [match.awayTeam];
    for (const leg of match.legs) {
      if (isLegOrientationDirect(match.homeTeam, match.awayTeam, leg.homeTeam, leg.awayTeam)) {
        homeNames.push(leg.homeTeam);
        awayNames.push(leg.awayTeam);
      } else if (
        isLegOrientationReversed(match.homeTeam, match.awayTeam, leg.homeTeam, leg.awayTeam)
      ) {
        homeNames.push(leg.awayTeam);
        awayNames.push(leg.homeTeam);
      }
    }

    const pool: ApiFootballFixture[] = [];
    for (const date of mappingDates(match.kickoff)) {
      pool.push(...(await fixturesOn(date)).filter((f) => f.league.id === leagueId));
    }
    const candidates = pool
      .filter((f) => !taken.has(String(f.fixture.id)))
      .map((f) => ({
        id: String(f.fixture.id),
        kickoff: new Date(f.fixture.date),
        home: f.teams.home.name,
        away: f.teams.away.name,
      }));

    const mapping = mapFixture(
      { kickoff: match.kickoff, homeNames: [...new Set(homeNames)], awayNames: [...new Set(awayNames)] },
      candidates,
      aliases
    );

    if (mapping.kind !== "mapped") {
      if (mapping.kind === "ambiguous") result.ambiguous++;
      else result.unmapped++;
      await prisma.match.update({
        where: { id: match.id },
        data: { apiFootballCheckedAt: now },
      });
      continue;
    }

    if (mapping.learned) {
      await recordLearnedAlias(mapping.learned, match.competitionId, aliases);
    }
    const fixture = pool.find((f) => String(f.fixture.id) === mapping.candidate.id)!;
    taken.add(mapping.candidate.id);
    await recordObservation({
      matchId: match.id,
      provider: PROVIDER,
      externalId: mapping.candidate.id,
      reversed: mapping.reversed,
      reading: apiFootballReading(fixture),
      existing: null,
      now,
    });
    await prisma.match.update({
      where: { id: match.id },
      data: { apiFootballCheckedAt: now },
    });
    const applied = await applyMatchConsensus(match.id, now);
    if (applied.scoreChanged) result.scoreChangedMatchIds.push(match.id);
    result.mapped++;
  }
}

async function pollMappedMatches(now: Date, result: ApiFootballSyncResult): Promise<void> {
  const observations = await prisma.matchObservation.findMany({
    where: {
      provider: PROVIDER,
      match: {
        kickoff: {
          gte: new Date(now.getTime() - MAPPING_LOOKBACK_MS),
          lte: new Date(now.getTime() + LIVE_POLL_BEFORE_MS),
        },
      },
    },
    include: { match: { select: { kickoff: true, finishedAt: true } } },
  });

  const due = observations.filter((obs) => shouldPollObservation(obs, obs.match, now));
  if (due.length === 0) return;

  const ids = due.map((obs) => Number(obs.externalId)).filter(Number.isFinite);
  result.requests += Math.ceil(ids.length / 20);
  const fixtures = await fetchApiFootballFixturesByIds(ids);
  const byId = new Map(fixtures.map((f) => [String(f.fixture.id), f]));

  for (const obs of due) {
    const fixture = byId.get(obs.externalId);
    if (!fixture) continue;
    result.polled++;
    const { changed } = await recordObservation({
      matchId: obs.matchId,
      provider: PROVIDER,
      externalId: obs.externalId,
      reversed: obs.reversed,
      reading: apiFootballReading(fixture),
      existing: obs,
      now,
    });
    if (!changed) continue;
    const applied = await applyMatchConsensus(obs.matchId, now);
    if (applied.scoreChanged) result.scoreChangedMatchIds.push(obs.matchId);
  }
}

/**
 * API-Football results + stats sweep: map Matches that have locked legs onto
 * fixtures, then poll mapped fixtures while live and for 24h after FT.
 * Budget: roughly one date lookup per new matchday plus one request per 20
 * live / recently-finished matches per run (see DEPLOYMENT.md).
 */
export async function syncApiFootballResults(
  now: Date = new Date()
): Promise<ApiFootballSyncResult> {
  const result: ApiFootballSyncResult = {
    mapped: 0,
    unmapped: 0,
    ambiguous: 0,
    polled: 0,
    requests: 0,
    scoreChangedMatchIds: [],
    quotaRemaining: null,
    errors: [],
  };

  const leagueByCompetition = new Map<string, number>();
  for (const competition of await getCompetitionsNeedingResults()) {
    if (competition.apiFootballLeagueId && !competition.manualSettlement) {
      leagueByCompetition.set(competition.id, competition.apiFootballLeagueId);
    }
  }

  if (leagueByCompetition.size > 0) {
    try {
      await mapUnmappedMatches(leagueByCompetition, now, result);
    } catch (err) {
      result.errors.push(`mapping: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  try {
    await pollMappedMatches(now, result);
  } catch (err) {
    result.errors.push(`polling: ${err instanceof Error ? err.message : String(err)}`);
  }

  result.quotaRemaining = apiFootballQuota.remaining;
  return result;
}
