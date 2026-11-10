/** Display helpers for the group leaderboard: hit rate and friendly tags. */

export interface LeaderboardTagInput {
  userId: string;
  points: number;
  legsWon: number;
  legsLost: number;
}

/** Settled legs a member needs before they can earn a leaderboard tag. */
export const LEADERBOARD_TAG_MIN_SETTLED = 3;

/** Whole-percent hit rate ("83% hit rate"), or null when nothing has settled yet. */
export function formatWinRate(legsWon: number, legsLost: number): string | null {
  const settled = legsWon + legsLost;
  if (settled <= 0) return null;
  const percent = Math.round((legsWon / settled) * 100);
  return `${percent}% hit rate`;
}

/**
 * Banter tags for the leaderboard. Only members with at least
 * LEADERBOARD_TAG_MIN_SETTLED settled legs are considered, and tags are only
 * handed out when at least two such members exist and their hit rates differ.
 * The single highest hit rate gets "Banker", the single lowest gets
 * "Acca killer". A tie at the top or bottom awards nobody that tag.
 */
export function getLeaderboardTags(
  entries: LeaderboardTagInput[],
): Record<string, string> {
  const eligible = entries
    .filter((e) => e.legsWon + e.legsLost >= LEADERBOARD_TAG_MIN_SETTLED)
    .map((e) => ({
      userId: e.userId,
      rate: e.legsWon / (e.legsWon + e.legsLost),
    }));

  const tags: Record<string, string> = {};
  if (eligible.length < 2) return tags;

  const rates = eligible.map((e) => e.rate);
  const high = Math.max(...rates);
  const low = Math.min(...rates);
  if (high === low) return tags;

  const top = eligible.filter((e) => e.rate === high);
  const bottom = eligible.filter((e) => e.rate === low);
  if (top.length === 1) tags[top[0].userId] = "Banker";
  if (bottom.length === 1) tags[bottom[0].userId] = "Acca killer";
  return tags;
}
