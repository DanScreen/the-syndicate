import type { Fixture } from "./types";
export function filterUpcomingFixtures(
  fixtures: Fixture[],
  now: Date = new Date()
): Fixture[] {
  const cutoff = now.getTime();
  return fixtures.filter((fixture) => new Date(fixture.kickoff).getTime() > cutoff);
}
