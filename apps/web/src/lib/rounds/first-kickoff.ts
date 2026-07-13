/** Earliest kickoff across a round's legs — lock and edit cutoff. */
export function firstKickoff(legs: { kickoff: Date }[]): Date | null {
  if (legs.length === 0) return null;
  return legs.reduce((min, l) => (l.kickoff < min ? l.kickoff : min), legs[0]!.kickoff);
}

export function isPastKickoffCutoff(
  legs: { kickoff: Date }[],
  now: Date = new Date()
): boolean {
  const cutoff = firstKickoff(legs);
  return cutoff !== null && now >= cutoff;
}
