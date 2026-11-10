import type { GroupSummary, GroupSummaryActiveBet } from "./api-types";

export type HomeCardState =
  /** Open round and the member still owes legs (or a solo acca with no legs yet). */
  | "needs-pick"
  /** Open round and the member is done, or a solo acca with at least one leg. */
  | "waiting"
  /** Round is locked (in play or awaiting kickoff). */
  | "betslip"
  /** Anything else: no active round. */
  | "fallback";

/**
 * Derives the home card state from the group's primary round (`activeRound`) and its
 * matching compact bet summary in `activeBets` (same id). When the bet summary is
 * missing, only the round-level fields are used.
 */
export function deriveHomeCardState(group: GroupSummary): {
  state: HomeCardState;
  bet: GroupSummaryActiveBet | null;
} {
  const round = group.activeRound;
  const bet = round ? (group.activeBets ?? []).find((b) => b.id === round.id) ?? null : null;
  if (!round) return { state: "fallback", bet };

  if (round.status === "open") {
    if (bet?.unlimitedLegs) {
      // Solo acca: no quota, but the member must add a first leg before it is live.
      const yourLegCount = bet.yourLegCount ?? group.yourLegCount;
      return { state: yourLegCount === 0 ? "needs-pick" : "waiting", bet };
    }
    const legsPerMember = bet?.legsPerMember ?? round.legsPerMember;
    const yourLegCount = bet?.yourLegCount ?? group.yourLegCount;
    return { state: yourLegCount < legsPerMember ? "needs-pick" : "waiting", bet };
  }

  if (round.status === "locked") return { state: "betslip", bet };
  return { state: "fallback", bet };
}
