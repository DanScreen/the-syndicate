import {
  fetchCompetitionMatches,
  regulationScore,
  syncDateRange,
  type FootballDataMatch,
} from "@/lib/results/football-data";
import { prisma } from "@tiki-acca/database";
import { COMPETITIONS } from "@tiki-acca/shared";

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
  };
}

async function upsertFootballDataMatch(
  competitionId: string,
  match: FootballDataMatch
): Promise<"created" | "updated" | "skipped"> {
  const data = matchDataFromFootballData(competitionId, match);
  if (!data) return "skipped";

  const existing = await prisma.match.findUnique({
    where: { externalDataId: match.id },
  });

  if (existing) {
    await prisma.match.update({
      where: { id: existing.id },
      data,
    });
    return "updated";
  }

  await prisma.match.create({ data });
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

export async function syncAllCompetitionMatches(): Promise<SyncMatchesResult> {
  const { from, to } = syncDateRange();
  const result: SyncMatchesResult = {
    competitions: [],
    totalCreated: 0,
    totalUpdated: 0,
    totalSkipped: 0,
  };

  for (const competition of COMPETITIONS) {
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
