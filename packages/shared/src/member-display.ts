/** Display helpers for member avatars and "waiting on" copy. */

export const AVATAR_COLORS: readonly string[] = [
  "#a78bfa",
  "#f472b6",
  "#fb923c",
  "#2dd4bf",
  "#818cf8",
  "#e879f9",
  "#fcd34d",
  "#94a3b8",
];

/** Up to two letters from a display name: first + last word initials, or the first two letters of a single word. Emoji-safe: works on code points, not UTF-16 units. */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return Array.from(words[0]).slice(0, 2).join("").toUpperCase();
  return (Array.from(words[0])[0] + Array.from(words[words.length - 1])[0]).toUpperCase();
}

/** Deterministic avatar colour for a seed (e.g. a user id). */
export function getAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (Math.imul(hash, 31) + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[(hash >>> 0) % AVATAR_COLORS.length];
}

/** First word of a display name, or "" when blank. */
export function getFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

/** "Waiting on Tom, Priya and Sam" style copy using first names only. */
export function formatWaitingOnNames(names: string[]): string {
  const first = names.map(getFirstName).filter(Boolean);
  if (first.length === 0) return "";
  if (first.length === 1) return `Waiting on ${first[0]}`;
  if (first.length === 2) return `Waiting on ${first[0]} and ${first[1]}`;
  if (first.length === 3) return `Waiting on ${first[0]}, ${first[1]} and ${first[2]}`;
  return `Waiting on ${first[0]}, ${first[1]} and ${first.length - 2} others`;
}
