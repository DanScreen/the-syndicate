import { prisma } from "@tiki-acca/database";
import {
  RESULT_CONFIRMATION_MS,
  formatFixtureLabel,
} from "@tiki-acca/shared";
import type { ObservedStats } from "@/lib/results/consensus";
import {
  isMatchResultConfirmed,
  isResultHeldForReview,
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

/** One results provider's view, in the Match's orientation. */
export type AdminResultsObservation = {
  provider: string;
  status: string;
  homeGoals90: number | null;
  awayGoals90: number | null;
  homeGoalsEnd: number | null;
  awayGoalsEnd: number | null;
  extraTime: boolean;
  corners: { home: number; away: number } | null;
  changedAt: string;
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
  /** agreed | single | conflict | abstain (null before any terminal result). */
  resultSource: string | null;
  /** Sources disagree / no 90' score — auto-settle held for an admin. */
  heldForReview: boolean;
  wentToExtraTime: boolean;
  observations: AdminResultsObservation[];
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
      observations: { orderBy: { provider: "asc" } },
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
      resultSource: match.resultSource,
      heldForReview: isResultHeldForReview(match),
      wentToExtraTime: match.wentToExtraTime,
      observations: match.observations.map((obs) => ({
        provider: obs.provider,
        status: obs.status,
        homeGoals90: obs.homeGoals90,
        awayGoals90: obs.awayGoals90,
        homeGoalsEnd: obs.homeGoalsEnd,
        awayGoalsEnd: obs.awayGoalsEnd,
        extraTime: obs.extraTime,
        corners: (obs.stats as ObservedStats | null)?.corners ?? null,
        changedAt: obs.changedAt.toISOString(),
      })),
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
