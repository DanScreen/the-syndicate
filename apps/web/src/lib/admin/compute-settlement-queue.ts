import { prisma } from "@tiki-acca/database";

/** A pending leg is flagged for intervention this long after its scheduled kickoff. */
export const OVERDUE_AFTER_HOURS = 2;

export type SettlementQueueLeg = {
  id: string;
  userName: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  kickoff: string;
  marketLabel: string;
  selectionLabel: string;
  odds: number;
  outcome: string;
  /** Still pending 2+ hours after scheduled kickoff — likely needs intervention. */
  overdue: boolean;
};

export type SettlementQueueRound = {
  id: string;
  status: string;
  groupId: string;
  groupName: string;
  lockedAt: string | null;
  settledAt: string | null;
  combinedOdds: number | null;
  resolvedCount: number;
  overdueCount: number;
  legs: SettlementQueueLeg[];
};

/**
 * Locked rounds awaiting settlement, plus settled rounds that still have
 * unfinished legs after an early loss. Overdue legs flagged.
 */
export async function computeSettlementQueue(now = new Date()): Promise<SettlementQueueRound[]> {
  const rounds = await prisma.round.findMany({
    where: {
      OR: [
        { status: "locked" },
        { status: "settled", legs: { some: { outcome: "pending" } } },
      ],
    },
    orderBy: { lockedAt: "asc" },
    include: {
      group: { select: { id: true, name: true } },
      legs: {
        orderBy: { kickoff: "asc" },
        include: { user: { select: { name: true } } },
      },
    },
  });

  const overdueThresholdMs = OVERDUE_AFTER_HOURS * 60 * 60 * 1000;

  const queue = rounds.map((round) => {
    const legs: SettlementQueueLeg[] = round.legs.map((leg) => ({
      id: leg.id,
      userName: leg.user.name,
      homeTeam: leg.homeTeam,
      awayTeam: leg.awayTeam,
      competition: leg.competition,
      kickoff: leg.kickoff.toISOString(),
      marketLabel: leg.marketLabel,
      selectionLabel: leg.selectionLabel,
      odds: leg.odds,
      outcome: leg.outcome,
      overdue:
        leg.outcome === "pending" &&
        now.getTime() - leg.kickoff.getTime() > overdueThresholdMs,
    }));

    return {
      id: round.id,
      status: round.status,
      groupId: round.group.id,
      groupName: round.group.name,
      lockedAt: round.lockedAt?.toISOString() ?? null,
      settledAt: round.settledAt?.toISOString() ?? null,
      combinedOdds: round.combinedOdds,
      resolvedCount: legs.filter((l) => l.outcome !== "pending").length,
      overdueCount: legs.filter((l) => l.overdue).length,
      legs,
    };
  });

  return queue.sort(
    (a, b) =>
      b.overdueCount - a.overdueCount ||
      (a.lockedAt ?? a.settledAt ?? "").localeCompare(b.lockedAt ?? b.settledAt ?? "")
  );
}
