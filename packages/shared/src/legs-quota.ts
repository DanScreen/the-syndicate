import { SOLO_MAX_LEGS, type LegsPerMember } from "./constants";

/**
 * Legs each member may submit in this round. Solo rounds (opened in a
 * one-member group) get `SOLO_MAX_LEGS` instead of the group quota, so the
 * member can build a full acca alone.
 */
export function effectiveLegQuota(round: {
  legsPerMember: number;
  unlimitedLegs?: boolean;
}): number {
  return round.unlimitedLegs ? SOLO_MAX_LEGS : round.legsPerMember;
}

/** Count submitted legs per userId. */
export function countLegsByUser(
  legs: ReadonlyArray<{ userId: string }>
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const leg of legs) {
    counts.set(leg.userId, (counts.get(leg.userId) ?? 0) + 1);
  }
  return counts;
}

/** True when every member has submitted at least `legsPerMember` legs. */
export function allMembersFilledQuota(params: {
  memberUserIds: ReadonlyArray<string>;
  legs: ReadonlyArray<{ userId: string }>;
  legsPerMember: number;
}): boolean {
  const { memberUserIds, legs, legsPerMember } = params;
  if (memberUserIds.length === 0 || legsPerMember < 1) return false;
  const counts = countLegsByUser(legs);
  return memberUserIds.every((id) => (counts.get(id) ?? 0) >= legsPerMember);
}

/** Members who still need at least one more leg for the round quota. */
export function membersMissingQuota(params: {
  memberUserIds: ReadonlyArray<string>;
  legs: ReadonlyArray<{ userId: string }>;
  legsPerMember: number;
}): string[] {
  const counts = countLegsByUser(params.legs);
  return params.memberUserIds.filter(
    (id) => (counts.get(id) ?? 0) < params.legsPerMember
  );
}

export function nextLegIndexForUser(
  legs: ReadonlyArray<{ userId: string; legIndex?: number }>,
  userId: string
): number {
  const userLegs = legs.filter((l) => l.userId === userId);
  const used = new Set(userLegs.map((leg, index) => leg.legIndex ?? index + 1));
  let next = 1;
  while (used.has(next)) next += 1;
  return next;
}

export function isValidLegsPerMember(value: number): value is LegsPerMember {
  return value === 1 || value === 2 || value === 3;
}
