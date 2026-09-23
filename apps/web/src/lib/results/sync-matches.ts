import {
  fetchCompetitionMatches,
  footballDataReading,
  isLegOrientationDirect,
  isLegOrientationReversed,
  syncDateRange,
  type FootballDataMatch,
} from "@/lib/results/football-data";
import { mapFixture, MAPPING_KICKOFF_WINDOW_MS } from "@/lib/results/map-fixture";
import { applyMatchConsensus, recordObservation } from "@/lib/results/observations";
import { loadAliasLookup, recordLearnedAlias } from "@/lib/results/team-alias-store";
import type { AliasLookup } from "@/lib/results/team-names";
import { getEnabledCompetitions } from "@/lib/competitions/settings";
import { prisma } from "@tiki-acca/database";
import type { Match, MatchObservation } from "@prisma/client";
import { COMPETITIONS, type Competition } from "@tiki-acca/shared";

const PROVIDER = "football_data";

export type UpsertMatchResult = {
  action: "created" | "updated" | "skipped";
  matchId?: string;
  /** True when terminal FT goals changed (or status newly became terminal). */
  scoreChanged: boolean;
};

type MatchWithFdObservation = Match & { observations: MatchObservation[] };

type CompetitionSyncContext = {
  competitionId: string;
  /** Matches already linked to a football-data fixture, by fixture id. */
  byExternalId: Map<number, MatchWithFdObservation>;
  /** Our matches not yet linked to football-data (e.g. created from legs). */
  unattached: Match[];
  aliases: AliasLookup;
  now: Date;
};

/** Is the football-data fixture listed home/away-swapped relative to our Match? */
function fixtureReversed(match: Match, fd: FootballDataMatch): boolean {
  const home = fd.homeTeam.name;
  const away = fd.awayTeam.name;
  return (
    !isLegOrientationDirect(match.homeTeam, match.awayTeam, home, away) &&
    isLegOrientationReversed(match.homeTeam, match.awayTeam, home, away)
  );
}

/**
 * Attach one football-data fixture to a Match (existing link → mapped
 * leg-created Match → new Match), record its observation, and recompute the
 * canonical result when the observation changed.
 */
async function syncFootballDataFixture(
  ctx: CompetitionSyncContext,
  fd: FootballDataMatch
): Promise<UpsertMatchResult> {
  const homeTeam = fd.homeTeam?.name;
  const awayTeam = fd.awayTeam?.name;
  if (!homeTeam || !awayTeam) return { action: "skipped", scoreChanged: false };

  const kickoff = new Date(fd.utcDate);
  let action: UpsertMatchResult["action"] = "updated";
  let match: Match | undefined = ctx.byExternalId.get(fd.id);
  let existingObservation: MatchObservation | null = null;
  let reversed = false;

  if (match) {
    existingObservation = ctx.byExternalId.get(fd.id)!.observations[0] ?? null;
    reversed = existingObservation?.reversed ?? fixtureReversed(match, fd);
    if (match.kickoff.getTime() !== kickoff.getTime()) {
      await prisma.match.update({ where: { id: match.id }, data: { kickoff } });
    }
  } else {
    const mapping = mapFixture(
      {
        kickoff,
        homeNames: [homeTeam, fd.homeTeam.shortName].filter((n): n is string => !!n),
        awayNames: [awayTeam, fd.awayTeam.shortName].filter((n): n is string => !!n),
      },
      ctx.unattached.map((m) => ({
        id: m.id,
        kickoff: m.kickoff,
        home: m.homeTeam,
        away: m.awayTeam,
      })),
      ctx.aliases,
      MAPPING_KICKOFF_WINDOW_MS
    );

    if (mapping.kind === "mapped") {
      match = ctx.unattached.find((m) => m.id === mapping.candidate.id)!;
      ctx.unattached = ctx.unattached.filter((m) => m.id !== match!.id);
      reversed = mapping.reversed;
      if (mapping.learned) {
        await recordLearnedAlias(mapping.learned, ctx.competitionId, ctx.aliases);
      }
      await prisma.match.update({
        where: { id: match.id },
        data: { externalDataId: fd.id, kickoff },
      });
    } else {
      match = await prisma.match.create({
        data: {
          competitionId: ctx.competitionId,
          kickoff,
          homeTeam,
          awayTeam,
          status: "SCHEDULED",
          externalDataId: fd.id,
        },
      });
      action = "created";
    }
  }

  const { changed } = await recordObservation({
    matchId: match.id,
    provider: PROVIDER,
    externalId: String(fd.id),
    reversed,
    reading: footballDataReading(fd),
    existing: existingObservation,
    now: ctx.now,
  });
  if (!changed) return { action, matchId: match.id, scoreChanged: false };

  const applied = await applyMatchConsensus(match.id, ctx.now);
  return { action, matchId: match.id, scoreChanged: applied.scoreChanged };
}

export type SyncMatchesResult = {
  competitions: {
    competitionId: string;
    created: number;
    updated: number;
    skipped: number;
    total: number;
    error?: string;
  }[];
  totalCreated: number;
  totalUpdated: number;
  totalSkipped: number;
  /** Match IDs whose terminal score changed this sync (candidates for reconcile). */
  scoreChangedMatchIds: string[];
};

/** Competitions with live settings or pending legs — used by every results feed. */
export async function getCompetitionsNeedingResults(): Promise<Competition[]> {
  const [enabledCompetitions, pendingLegs] = await Promise.all([
    getEnabledCompetitions(),
    prisma.leg.findMany({
      where: { outcome: "pending" },
      select: { competitionId: true },
      distinct: ["competitionId"],
    }),
  ]);
  const requiredIds = new Set([
    ...enabledCompetitions.map((competition) => competition.id),
    ...pendingLegs.map((leg) => leg.competitionId),
  ]);
  return COMPETITIONS.filter((competition) => requiredIds.has(competition.id));
}

async function loadCompetitionContext(
  competitionId: string,
  fixtures: FootballDataMatch[],
  from: Date,
  to: Date,
  aliases: AliasLookup,
  now: Date
): Promise<CompetitionSyncContext> {
  const [linked, unattached] = await Promise.all([
    prisma.match.findMany({
      where: { externalDataId: { in: fixtures.map((f) => f.id) } },
      include: { observations: { where: { provider: PROVIDER } } },
    }),
    prisma.match.findMany({
      where: {
        competitionId,
        externalDataId: null,
        kickoff: {
          gte: new Date(from.getTime() - MAPPING_KICKOFF_WINDOW_MS),
          lte: new Date(to.getTime() + MAPPING_KICKOFF_WINDOW_MS),
        },
      },
    }),
  ]);
  return {
    competitionId,
    byExternalId: new Map(linked.map((m) => [m.externalDataId!, m])),
    unattached,
    aliases,
    now,
  };
}

/** football-data.org sweep (−3 … +14 days) for every competition it covers. */
export async function syncAllCompetitionMatches(
  now: Date = new Date()
): Promise<SyncMatchesResult> {
  const { from, to } = syncDateRange();
  // Only competitions on our football-data.org tier; the rest come from API-Football.
  const competitions = (await getCompetitionsNeedingResults()).filter(
    (competition) => competition.footballDataCode !== "" && !competition.manualSettlement
  );
  const aliases = await loadAliasLookup();
  const result: SyncMatchesResult = {
    competitions: [],
    totalCreated: 0,
    totalUpdated: 0,
    totalSkipped: 0,
    scoreChangedMatchIds: [],
  };

  for (const competition of competitions) {
    const entry: SyncMatchesResult["competitions"][number] = {
      competitionId: competition.id,
      created: 0,
      updated: 0,
      skipped: 0,
      total: 0,
    };

    try {
      const fixtures = await fetchCompetitionMatches(competition.footballDataCode, from, to, {
        bypassCache: true,
      });
      entry.total = fixtures.length;
      const ctx = await loadCompetitionContext(
        competition.id,
        fixtures,
        from,
        to,
        aliases,
        now
      );

      for (const fixture of fixtures) {
        const upsert = await syncFootballDataFixture(ctx, fixture);
        if (upsert.action === "created") {
          entry.created++;
          result.totalCreated++;
        } else if (upsert.action === "updated") {
          entry.updated++;
          result.totalUpdated++;
        } else {
          entry.skipped++;
          result.totalSkipped++;
        }
        if (upsert.scoreChanged && upsert.matchId) {
          result.scoreChangedMatchIds.push(upsert.matchId);
        }
      }
    } catch (err) {
      entry.error = err instanceof Error ? err.message : "Sync failed";
    }

    result.competitions.push(entry);
  }

  return result;
}
