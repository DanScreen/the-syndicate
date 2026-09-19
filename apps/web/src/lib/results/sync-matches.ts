import {
  fetchCompetitionMatches,
  regulationScore,
  syncDateRange,
  type FootballDataMatch,
} from "@/lib/results/football-data";
import {
  isTerminalMatchStatus,
  matchScoreChanged,
} from "@/lib/results/result-confirmation";
import { getEnabledCompetitions } from "@/lib/competitions/settings";
import { prisma } from "@tiki-acca/database";
import {
  COMPETITIONS,
  RESULT_CONFIRMATION_MS,
  competitionNeedsManualSettlement,
  type Competition,
} from "@tiki-acca/shared";

function matchDataFromFootballData(competitionId: string, match: FootballDataMatch) {
  const homeTeam = match.homeTeam?.name;
  const awayTeam = match.awayTeam?.name;
  if (!homeTeam || !awayTeam) return null;

  const regulation = regulationScore(match);
  if (!regulation) return null;

  const now = new Date();
  return {
    competitionId,
    kickoff: new Date(match.utcDate),
    homeTeam,
    awayTeam,
    status: match.status,
    homeGoals: regulation.home,
    awayGoals: regulation.away,
    externalDataId: match.id,
    lastSyncedAt: now,
    /** Set by upsert when first observing a terminal status. */
    isTerminal: isTerminalMatchStatus(match.status),
  };
}

export type UpsertMatchResult = {
  action: "created" | "updated" | "skipped";
  matchId?: string;
  /** True when terminal FT goals changed (or status newly became terminal). */
  scoreChanged: boolean;
};

async function upsertFootballDataMatch(
  competitionId: string,
  match: FootballDataMatch
): Promise<UpsertMatchResult> {
  const data = matchDataFromFootballData(competitionId, match);
  if (!data) return { action: "skipped", scoreChanged: false };

  const { isTerminal, ...syncFields } = data;
  const existing = await prisma.match.findUnique({
    where: { externalDataId: match.id },
  });

  if (existing) {
    // Admin override wins — keep status/score/finishedAt, only bump lastSyncedAt.
    if (existing.scoreLocked) {
      await prisma.match.update({
        where: { id: existing.id },
        data: { lastSyncedAt: syncFields.lastSyncedAt },
      });
      return { action: "updated", matchId: existing.id, scoreChanged: false };
    }

    const becomingTerminal =
      isTerminal && !isTerminalMatchStatus(existing.status);
    const scoreChanged =
      becomingTerminal ||
      (isTerminal &&
        matchScoreChanged(
          { homeGoals: existing.homeGoals, awayGoals: existing.awayGoals },
          { homeGoals: syncFields.homeGoals, awayGoals: syncFields.awayGoals }
        ));

    const finishedAt =
      existing.finishedAt ??
      (isTerminal
        ? // Already terminal before finishedAt existed → treat as confirmed.
          isTerminalMatchStatus(existing.status)
          ? new Date(syncFields.lastSyncedAt.getTime() - RESULT_CONFIRMATION_MS)
          : syncFields.lastSyncedAt
        : null);

    let scoreStableSince = existing.scoreStableSince;
    if (!isTerminal) {
      scoreStableSince = null;
    } else if (scoreChanged) {
      // FT goals changed (or newly terminal) → restart the stability clock.
      scoreStableSince = syncFields.lastSyncedAt;
    } else if (!scoreStableSince) {
      // Deploy / schema backfill: align with finishedAt so already-stable
      // terminal rows do not re-enter the confirmation window.
      scoreStableSince = finishedAt;
    }

    await prisma.match.update({
      where: { id: existing.id },
      data: {
        ...syncFields,
        finishedAt,
        scoreStableSince,
      },
    });
    return {
      action: "updated",
      matchId: existing.id,
      scoreChanged: isTerminal && scoreChanged,
    };
  }

  const created = await prisma.match.create({
    data: {
      ...syncFields,
      finishedAt: isTerminal ? syncFields.lastSyncedAt : null,
      scoreStableSince: isTerminal ? syncFields.lastSyncedAt : null,
    },
  });
  return {
    action: "created",
    matchId: created.id,
    scoreChanged: isTerminal,
  };
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

async function getCompetitionsToSync(): Promise<Competition[]> {
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

  // Manual-settlement competitions have no football-data.org code on our tier;
  // skip them so sync doesn't fire a doomed request and log a spurious error.
  return COMPETITIONS.filter(
    (competition) =>
      requiredIds.has(competition.id) && !competitionNeedsManualSettlement(competition)
  );
}

export async function syncAllCompetitionMatches(): Promise<SyncMatchesResult> {
  const { from, to } = syncDateRange();
  const competitions = await getCompetitionsToSync();
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
      const matches = await fetchCompetitionMatches(competition.footballDataCode, from, to, {
        bypassCache: true,
      });
      entry.total = matches.length;

      for (const match of matches) {
        const upsert = await upsertFootballDataMatch(competition.id, match);
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
