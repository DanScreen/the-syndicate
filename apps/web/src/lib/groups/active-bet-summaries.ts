import {
  effectiveLegQuota,
  type GroupSummaryActiveBet,
  type RoundStatus,
} from "@tiki-acca/shared";

type SummaryRound = {
  id: string;
  betNumber: number | null;
  status: string;
  combinedOdds: number | null;
  legsPerMember: number;
  unlimitedLegs: boolean;
  legs: {
    userId: string;
    kickoff: Date;
    outcome: string;
  }[];
};

export function activeBetSummaries(
  rounds: SummaryRound[],
  userId: string,
  memberCount: number
): GroupSummaryActiveBet[] {
  return rounds
    .filter((round) => round.status === "open" || round.status === "locked")
    .map((round) => {
      const firstKickoff =
        round.legs.length > 0
          ? new Date(
              Math.min(...round.legs.map((leg) => leg.kickoff.getTime()))
            ).toISOString()
          : null;
      return {
        id: round.id,
        betNumber: round.betNumber,
        status: round.status as RoundStatus,
        combinedOdds: round.combinedOdds,
        legsPerMember: round.legsPerMember,
        unlimitedLegs: round.unlimitedLegs,
        submittedLegCount: round.legs.length,
        // A solo acca has no required total — it is done when the member locks it.
        requiredLegCount: round.unlimitedLegs
          ? round.legs.length
          : memberCount * round.legsPerMember,
        yourLegCount: round.legs.filter((leg) => leg.userId === userId).length,
        resolvedLegCount: round.legs.filter(
          (leg) => leg.outcome !== "pending"
        ).length,
        firstKickoff,
      };
    })
    .sort((a, b) => {
      const priority = (bet: GroupSummaryActiveBet) =>
        bet.status === "open" && bet.yourLegCount < effectiveLegQuota(bet)
          ? 0
          : bet.status === "open"
            ? 1
            : 2;
      return (
        priority(a) - priority(b) ||
        (b.betNumber ?? 0) - (a.betNumber ?? 0)
      );
    });
}
