import {
  isLegOrientationDirect,
  isLegOrientationReversed,
} from "@/lib/results/football-data";
import { isVoidMatchStatus } from "@/lib/results/result-confirmation";
import { prisma } from "@tiki-acca/database";

type FixtureRef = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string | Date;
};

const VOID_MATCH_STATUSES = ["POSTPONED", "CANCELLED", "SUSPENDED", "AWARDED"];

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Ids of the fixtures whose match the results feeds report as postponed or
 * cancelled. The odds cache keeps listing such fixtures at their original
 * kickoff, but a pick on one only goes void — so they are hidden from the
 * picker and refused on submit or change.
 */
export async function calledOffFixtureIds(
  competitionId: string,
  fixtures: FixtureRef[]
): Promise<Set<string>> {
  if (fixtures.length === 0) return new Set();

  const kickoffs = fixtures.map((f) => new Date(f.kickoff).getTime());
  const start = new Date(`${utcDay(new Date(Math.min(...kickoffs)))}T00:00:00.000Z`);
  const end = new Date(`${utcDay(new Date(Math.max(...kickoffs)))}T23:59:59.999Z`);

  const matches = await prisma.match.findMany({
    where: {
      status: { in: VOID_MATCH_STATUSES },
      OR: [
        { externalOddsId: { in: fixtures.map((f) => f.id) } },
        { competitionId, kickoff: { gte: start, lte: end } },
      ],
    },
    select: { status: true, externalOddsId: true, kickoff: true, homeTeam: true, awayTeam: true },
  });
  const calledOff = matches.filter((m) => isVoidMatchStatus(m.status));

  const ids = new Set<string>();
  for (const fixture of fixtures) {
    const day = utcDay(new Date(fixture.kickoff));
    const hit = calledOff.some(
      (m) =>
        m.externalOddsId === fixture.id ||
        (utcDay(m.kickoff) === day &&
          (isLegOrientationDirect(m.homeTeam, m.awayTeam, fixture.homeTeam, fixture.awayTeam) ||
            isLegOrientationReversed(m.homeTeam, m.awayTeam, fixture.homeTeam, fixture.awayTeam)))
    );
    if (hit) ids.add(fixture.id);
  }
  return ids;
}

export async function isFixtureCalledOff(
  competitionId: string,
  fixture: FixtureRef
): Promise<boolean> {
  return (await calledOffFixtureIds(competitionId, [fixture])).has(fixture.id);
}

export const CALLED_OFF_FIXTURE_ERROR =
  "That match has been postponed or cancelled, so a pick on it would be void. Choose another match.";
