import type { GroupSummaryActiveBet, RoundStatus } from "@tiki-acca/shared";

type SummaryRound = {
  id: string;
  betNumber: number | null;
  status: string;
  combinedOdds: number | null;
  legsPerMember: number;
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
        submittedLegCount: round.legs.length,
        requiredLegCount: memberCount * round.legsPerMember,
        yourLegCount: round.legs.filter((leg) => leg.userId === userId).length,
        resolvedLegCount: round.legs.filter(
          (leg) => leg.outcome !== "pending"
        ).length,
        firstKickoff,
      };
    })
    .sort((a, b) => {
      const priority = (bet: GroupSummaryActiveBet) =>
        bet.status === "open" && bet.yourLegCount < bet.legsPerMember
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
