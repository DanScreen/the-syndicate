import type { Fixture } from "./types";
export function filterUpcomingFixtures(
  fixtures: Fixture[],
  now: Date = new Date()
): Fixture[] {
  const cutoff = now.getTime();
  return fixtures.filter((fixture) => new Date(fixture.kickoff).getTime() > cutoff);
}

/**
 * Outright fixtures are synthetic — one per competition, no real match behind
 * them — so their ids carry this prefix. Everything that renders or resolves a
 * fixture keys off it, so it lives here rather than in either app.
 */
export const OUTRIGHT_FIXTURE_PREFIX = "outright:";

export function isOutrightFixtureId(fixtureId: string): boolean {
  return fixtureId.startsWith(OUTRIGHT_FIXTURE_PREFIX);
}

export function outrightFixtureId(competitionId: string): string {
  return `${OUTRIGHT_FIXTURE_PREFIX}${competitionId}:league_winner`;
}

/**
 * Display label for a fixture or a stored leg. Outrights have no opponent, so
 * "Home vs Away" would read "Premier League vs Outright winner".
 */
export function formatFixtureLabel(
  fixture: { id?: string; fixtureId?: string; homeTeam: string; awayTeam: string },
  separator: "vs" | "v" = "vs"
): string {
  const id = fixture.fixtureId ?? fixture.id ?? "";
  if (isOutrightFixtureId(id)) return `${fixture.homeTeam} — Outright`;
  return `${fixture.homeTeam} ${separator} ${fixture.awayTeam}`;
}

/**
 * Placeholder kickoff for outright picks — the end of the season currently in
 * play. Seasons run Aug–May, so anything from June onward belongs to the season
 * ending next May; Jan–May is still the season ending this May.
 */
export function currentSeasonEndDate(now: Date = new Date()): Date {
  const year = now.getUTCMonth() >= 5 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  return new Date(Date.UTC(year, 4, 31, 23, 59, 59));
}
