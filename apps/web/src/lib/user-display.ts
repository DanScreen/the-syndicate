/** First name for header greetings; falls back for legacy sessions. */
export function greetingFirstName(user: {
  firstName?: string | null;
  name?: string | null;
}): string {
  const first = user.firstName?.trim();
  if (first) return first;
  const fromName = user.name?.trim().split(/\s+/)[0];
  return fromName || "Player";
}
