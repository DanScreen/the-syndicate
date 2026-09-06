import {
  fetchCompetitionMatches,
  regulationScore,
  syncDateRange,
  type FootballDataMatch,
} from "@/lib/results/football-data";
import { isTerminalMatchStatus } from "@/lib/results/result-confirmation";
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

async function upsertFootballDataMatch(
  competitionId: string,
  match: FootballDataMatch
): Promise<"created" | "updated" | "skipped"> {
  const data = matchDataFromFootballData(competitionId, match);
  if (!data) return "skipped";

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
      return "updated";
    }

    const finishedAt =
      existing.finishedAt ??
      (isTerminal
        ? // Already terminal before finishedAt existed → treat as confirmed.
          isTerminalMatchStatus(existing.status)
          ? new Date(syncFields.lastSyncedAt.getTime() - RESULT_CONFIRMATION_MS)
          : syncFields.lastSyncedAt
        : null);

    await prisma.match.update({
      where: { id: existing.id },
      data: {
        ...syncFields,
        finishedAt,
      },
    });
    return "updated";
  }

  await prisma.match.create({
    data: {
      ...syncFields,
      finishedAt: isTerminal ? syncFields.lastSyncedAt : null,
    },
  });
  return "created";
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
        const action = await upsertFootballDataMatch(competition.id, match);
        if (action === "created") {
          entry.created++;
          result.totalCreated++;
        } else if (action === "updated") {
          entry.updated++;
          result.totalUpdated++;
        } else {
          entry.skipped++;
          result.totalSkipped++;
        }
      }
    } catch (err) {
      entry.error = err instanceof Error ? err.message : "Sync failed";
    }

    result.competitions.push(entry);
  }

  return result;
}
