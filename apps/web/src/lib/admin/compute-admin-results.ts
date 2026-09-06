import { prisma } from "@tiki-acca/database";
import {
  RESULT_CONFIRMATION_MS,
  formatFixtureLabel,
} from "@tiki-acca/shared";
import {
  isMatchResultConfirmed,
  resultConfirmationRemainingMs,
} from "@/lib/results/result-confirmation";

export type AdminResultsMatchLeg = {
  id: string;
  roundId: string;
  roundStatus: string;
  groupName: string;
  userName: string;
  selectionLabel: string;
  marketLabel: string;
  outcome: string;
  fixtureLabel: string;
};

export type AdminResultsMatch = {
  id: string;
  competitionId: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  status: string;
  homeGoals: number | null;
  awayGoals: number | null;
  scoreLocked: boolean;
  finishedAt: string | null;
  confirmed: boolean;
  confirmationRemainingMs: number;
  confirmationWindowMs: number;
  legs: AdminResultsMatchLeg[];
};

/** Recent finished (or in-play) matches that have legs — for admin score overrides. */
export async function computeAdminResultsMatches(
  now = new Date(),
  lookbackDays = 7
): Promise<AdminResultsMatch[]> {
  const since = new Date(now);
  since.setDate(since.getDate() - lookbackDays);

  const matches = await prisma.match.findMany({
    where: {
      kickoff: { gte: since },
      OR: [
        { status: { in: ["FINISHED", "IN_PLAY", "PAUSED", "AWARDED"] } },
        { legs: { some: {} } },
        { scoreLocked: true },
      ],
    },
    orderBy: { kickoff: "desc" },
    include: {
      legs: {
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: { name: true } },
          round: {
            select: {
              id: true,
              status: true,
              group: { select: { name: true } },
            },
          },
        },
      },
    },
    take: 100,
  });

  return matches
    .filter((m) => m.legs.length > 0 || m.scoreLocked || m.status === "FINISHED")
    .map((match) => ({
      id: match.id,
      competitionId: match.competitionId,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      kickoff: match.kickoff.toISOString(),
      status: match.status,
      homeGoals: match.homeGoals,
      awayGoals: match.awayGoals,
      scoreLocked: match.scoreLocked,
      finishedAt: match.finishedAt?.toISOString() ?? null,
      confirmed: isMatchResultConfirmed(match, now),
      confirmationRemainingMs: resultConfirmationRemainingMs(match, now),
      confirmationWindowMs: RESULT_CONFIRMATION_MS,
      legs: match.legs.map((leg) => ({
        id: leg.id,
        roundId: leg.roundId,
        roundStatus: leg.round.status,
        groupName: leg.round.group.name,
        userName: leg.user.name,
        selectionLabel: leg.selectionLabel,
        marketLabel: leg.marketLabel,
        outcome: leg.outcome,
        fixtureLabel: formatFixtureLabel(leg),
      })),
    }));
}
