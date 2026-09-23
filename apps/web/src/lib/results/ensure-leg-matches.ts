import {
  isLegOrientationDirect,
  isLegOrientationReversed,
} from "@/lib/results/football-data";
import { MAPPING_KICKOFF_WINDOW_MS } from "@/lib/results/map-fixture";
import { prisma } from "@tiki-acca/database";
import { isOutrightFixtureId } from "@tiki-acca/shared";

/** How far back to look for locked legs still missing a Match. */
const LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;
const LOOKAHEAD_MS = 14 * 24 * 60 * 60 * 1000;

export type EnsureLegMatchesResult = {
  fixtures: number;
  created: number;
  adopted: number;
  legsLinked: number;
};

/**
 * Every locked/settled leg gets a canonical Match, keyed by the Odds API event
 * id (`externalOddsId`). football-data.org creates Matches for the leagues it
 * covers; for the rest (Nations League, League One/Two, cups…) this is where
 * the Match comes from, so API-Football has something to map onto.
 */
export async function ensureMatchesForLockedLegs(
  now: Date = new Date()
): Promise<EnsureLegMatchesResult> {
  const legs = await prisma.leg.findMany({
    where: {
      matchId: null,
      outcome: "pending",
      round: { status: { in: ["locked", "settled"] } },
      kickoff: {
        gte: new Date(now.getTime() - LOOKBACK_MS),
        lte: new Date(now.getTime() + LOOKAHEAD_MS),
      },
    },
    select: {
      id: true,
      fixtureId: true,
      competitionId: true,
      homeTeam: true,
      awayTeam: true,
      kickoff: true,
    },
  });

  const byFixture = new Map<string, typeof legs>();
  for (const leg of legs) {
    if (isOutrightFixtureId(leg.fixtureId)) continue;
    const list = byFixture.get(leg.fixtureId) ?? [];
    list.push(leg);
    byFixture.set(leg.fixtureId, list);
  }

  const result: EnsureLegMatchesResult = {
    fixtures: byFixture.size,
    created: 0,
    adopted: 0,
    legsLinked: 0,
  };

  for (const [fixtureId, fixtureLegs] of byFixture) {
    const leg = fixtureLegs[0]!;
    let match = await prisma.match.findUnique({ where: { externalOddsId: fixtureId } });

    if (!match) {
      const candidates = await prisma.match.findMany({
        where: {
          competitionId: leg.competitionId,
          externalOddsId: null,
          kickoff: {
            gte: new Date(leg.kickoff.getTime() - MAPPING_KICKOFF_WINDOW_MS),
            lte: new Date(leg.kickoff.getTime() + MAPPING_KICKOFF_WINDOW_MS),
          },
        },
      });
      const found =
        candidates.find((m) =>
          isLegOrientationDirect(m.homeTeam, m.awayTeam, leg.homeTeam, leg.awayTeam)
        ) ??
        candidates.find((m) =>
          isLegOrientationReversed(m.homeTeam, m.awayTeam, leg.homeTeam, leg.awayTeam)
        );

      if (found) {
        match = await prisma.match.update({
          where: { id: found.id },
          data: { externalOddsId: fixtureId },
        });
        result.adopted++;
      } else {
        match = await prisma.match.create({
          data: {
            competitionId: leg.competitionId,
            kickoff: leg.kickoff,
            homeTeam: leg.homeTeam,
            awayTeam: leg.awayTeam,
            status: "SCHEDULED",
            externalOddsId: fixtureId,
          },
        });
        result.created++;
      }
    }

    const linked = await prisma.leg.updateMany({
      where: { id: { in: fixtureLegs.map((l) => l.id) }, matchId: null },
      data: { matchId: match.id },
    });
    result.legsLinked += linked.count;
  }

  return result;
}
