/**
 * Earliest kickoff across a round's live legs — lock and edit cutoff. Void
 * legs (postponed, cancelled…) never kick off, so they don't count.
 */
export function firstKickoff(legs: { kickoff: Date; outcome?: string }[]): Date | null {
  let min: Date | null = null;
  for (const leg of legs) {
    if (leg.outcome === "void") continue;
    if (!min || leg.kickoff < min) min = leg.kickoff;
  }
  return min;
}

export function isPastKickoffCutoff(
  legs: { kickoff: Date; outcome?: string }[],
  now: Date = new Date()
): boolean {
  const cutoff = firstKickoff(legs);
  return cutoff !== null && now >= cutoff;
}
