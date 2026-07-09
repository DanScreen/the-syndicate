import {
  fetchCompetitionMatches,
  syncDateRange,
  type FootballDataMatch,
} from "@/lib/results/football-data";
import { prisma } from "@the-syndicate/database";
import { COMPETITIONS } from "@the-syndicate/shared";

function matchDataFromFootballData(competitionId: string, match: FootballDataMatch) {
  const now = new Date();
  return {
    competitionId,
    kickoff: new Date(match.utcDate),
    homeTeam: match.homeTeam.name,
    awayTeam: match.awayTeam.name,
    status: match.status,
    homeGoals: match.score.fullTime.home,
    awayGoals: match.score.fullTime.away,
    externalDataId: match.id,
    lastSyncedAt: now,
  };
}

async function upsertFootballDataMatch(
  competitionId: string,
  match: FootballDataMatch
): Promise<"created" | "updated"> {
  const data = matchDataFromFootballData(competitionId, match);

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
    total: number;
    error?: string;
  }[];
  totalCreated: number;
  totalUpdated: number;
};

export async function syncAllCompetitionMatches(): Promise<SyncMatchesResult> {
  const { from, to } = syncDateRange();
  const result: SyncMatchesResult = {
    competitions: [],
    totalCreated: 0,
    totalUpdated: 0,
  };

  for (const competition of COMPETITIONS) {
    const entry: SyncMatchesResult["competitions"][number] = {
      competitionId: competition.id,
      created: 0,
      updated: 0,
      total: 0,
    };

    try {
      const matches = await fetchCompetitionMatches(competition.footballDataCode, from, to);
      entry.total = matches.length;

      for (const match of matches) {
        const action = await upsertFootballDataMatch(competition.id, match);
        if (action === "created") {
          entry.created++;
          result.totalCreated++;
        } else {
          entry.updated++;
          result.totalUpdated++;
        }
      }
    } catch (err) {
      entry.error = err instanceof Error ? err.message : "Sync failed";
    }

    result.competitions.push(entry);
  }

  return result;
}
