import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { prisma } from "@tiki-acca/database";
import { dbMatchToResult } from "./match-store";
import { applyMatchConsensus, recordObservation } from "./observations";
import type { ApiFootballFixture } from "./providers/api-football";
import { isResultHeldForReview } from "./result-confirmation";
import { mappingDates, shouldPollObservation, syncApiFootballResults } from "./sync-api-football";

const HOUR = 60 * 60 * 1000;
const groupIds: string[] = [];
const userIds: string[] = [];
const matchIds: string[] = [];

// Far-future kickoff so the sync's time windows only see this test's data.
const kickoff = new Date("2031-06-05T18:45:00.000Z");
const fixtureId = 900_000_000 + Math.floor(Math.random() * 90_000_000);

function fixture(leagueId: number, id: number): ApiFootballFixture {
  // API-Football lists the tie the other way round (and says "Türkiye").
  return {
    fixture: { id, date: kickoff.toISOString(), status: { short: "FT" } },
    league: { id: leagueId },
    teams: { home: { id: 1, name: "Wales" }, away: { id: 2, name: "Türkiye" } },
    goals: { home: 1, away: 2 },
    score: { halftime: { home: 0, away: 1 }, fulltime: { home: 1, away: 2 } },
    statistics: [
      { team: { id: 1 }, statistics: [{ type: "Corner Kicks", value: 3 }] },
      { team: { id: 2 }, statistics: [{ type: "Corner Kicks", value: 8 }] },
    ],
  };
}

const realFetch = globalThis.fetch;
const realKey = process.env.API_FOOTBALL_KEY;
const requested: string[] = [];

before(() => {
  process.env.API_FOOTBALL_KEY = "test-dummy-key";
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input : input.url);
    requested.push(url.search);
    const response = url.searchParams.has("date")
      ? // Same teams in a friendly at the same time: must be filtered by league.
        [fixture(5, fixtureId), fixture(10, fixtureId + 1)]
      : [fixture(5, fixtureId)];
    return new Response(JSON.stringify({ errors: [], response }), {
      headers: { "x-ratelimit-requests-remaining": "7400" },
    });
  }) as typeof fetch;
});

after(async () => {
  globalThis.fetch = realFetch;
  if (realKey === undefined) delete process.env.API_FOOTBALL_KEY;
  else process.env.API_FOOTBALL_KEY = realKey;
  await prisma.group.deleteMany({ where: { id: { in: groupIds } } });
  await prisma.match.deleteMany({ where: { id: { in: matchIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

async function createMatchWithLockedLeg() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const match = await prisma.match.create({
    data: { competitionId: "nations-league", kickoff, homeTeam: "Turkey", awayTeam: "Wales" },
  });
  matchIds.push(match.id);
  const user = await prisma.user.create({
    data: {
      firstName: "Sync",
      lastName: "Tester",
      name: "Sync Tester",
      email: `af-sync-${suffix}@example.test`,
      passwordHash: "not-a-real-hash",
    },
  });
  userIds.push(user.id);
  const group = await prisma.group.create({
    data: {
      name: `AF sync test ${suffix}`,
      inviteCode: Math.random().toString(36).slice(2, 12),
      ownerId: user.id,
      members: { create: { userId: user.id, role: "owner" } },
      rounds: {
        create: {
          status: "locked",
          betNumber: 1,
          lockedAt: new Date(),
          legs: {
            create: {
              userId: user.id,
              fixtureId: `evt-af-${suffix}`,
              competitionId: "nations-league",
              matchId: match.id,
              homeTeam: "Turkey",
              awayTeam: "Wales",
              competition: "UEFA Nations League",
              kickoff,
              marketType: "corners_over_under_95",
              marketLabel: "Total Corners O/U 9.5",
              selectionId: "over",
              selectionLabel: "Over 9.5",
              odds: 1.9,
              bookmakerId: "williamhill",
              bookmakerName: "William Hill",
            },
          },
        },
      },
    },
  });
  groupIds.push(group.id);
  return match;
}

describe("API-Football sync (mocked feed)", () => {
  it("maps a reversed, aliased fixture and settles from a single source", async () => {
    const match = await createMatchWithLockedLeg();
    const now = new Date(kickoff.getTime() + 2.5 * HOUR);

    const summary = await syncApiFootballResults(now);
    assert.deepEqual(summary.errors, []);
    assert.equal(summary.mapped, 1);
    assert.equal(summary.quotaRemaining, 7400);
    assert.ok(requested.every((q) => !q.includes("league")), "date lookups are league-agnostic");

    const obs = await prisma.matchObservation.findUniqueOrThrow({
      where: { matchId_provider: { matchId: match.id, provider: "api_football" } },
    });
    assert.equal(obs.externalId, String(fixtureId));
    assert.equal(obs.reversed, true);

    const synced = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    assert.equal(synced.status, "FINISHED");
    // Oriented to our Match (Turkey home), not the provider's listing.
    assert.deepEqual([synced.homeGoals, synced.awayGoals], [2, 1]);
    assert.deepEqual([synced.homeGoalsHt, synced.awayGoalsHt], [1, 0]);
    assert.deepEqual((synced.stats as { corners: unknown }).corners, { home: 8, away: 3 });
    assert.equal(synced.resultSource, "single");
    assert.ok(synced.statsStableSince);

    // Corners only reach settlement once the result and stats have both settled.
    assert.equal(dbMatchToResult(synced, now)?.stats?.corners, undefined);
    const later = dbMatchToResult(synced, new Date(now.getTime() + 3 * HOUR));
    assert.deepEqual(later?.stats?.corners, { home: 8, away: 3 });

    // A second run straight away doesn't re-map or re-poll (15-min interval).
    const again = await syncApiFootballResults(new Date(now.getTime() + 60_000));
    assert.equal(again.mapped, 0);
    assert.equal(again.polled, 0);
  });

  it("holds a conflicting second source for review until an admin locks", async () => {
    const match = await createMatchWithLockedLeg();
    const now = new Date(kickoff.getTime() + 2.5 * HOUR);
    // The feed's only fixture is already claimed by the first test's Match, so
    // record API-Football's reading directly.
    await recordObservation({
      matchId: match.id,
      provider: "api_football",
      externalId: `af-test-${match.id}`,
      reversed: false,
      reading: {
        status: "FINISHED",
        homeGoals90: 2,
        awayGoals90: 1,
        homeGoalsEnd: 2,
        awayGoalsEnd: 1,
        homeGoalsHt: 1,
        awayGoalsHt: 0,
        extraTime: false,
        stats: { corners: { home: 8, away: 3 } },
      },
      now,
    });
    assert.equal((await applyMatchConsensus(match.id, now)).kind, "single");

    const reading = {
      status: "FINISHED",
      homeGoals90: 2,
      awayGoals90: 2,
      homeGoalsEnd: 2,
      awayGoalsEnd: 2,
      homeGoalsHt: 1,
      awayGoalsHt: 0,
      extraTime: false,
      stats: null,
    };
    const { changed } = await recordObservation({
      matchId: match.id,
      provider: "football_data",
      externalId: `fd-test-${fixtureId}-${match.id}`,
      reversed: false,
      reading,
      now,
    });
    assert.equal(changed, true);
    const applied = await applyMatchConsensus(match.id, now);
    assert.equal(applied.kind, "conflict");

    const held = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    assert.deepEqual([held.homeGoals, held.awayGoals], [2, 1], "canonical score untouched");
    assert.equal(isResultHeldForReview(held), true);
    assert.equal(dbMatchToResult(held, new Date(now.getTime() + 3 * HOUR))?.stats?.corners, undefined);

    await prisma.match.update({ where: { id: match.id }, data: { scoreLocked: true } });
    assert.equal((await applyMatchConsensus(match.id, now)).kind, "locked");
    const locked = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    assert.equal(isResultHeldForReview(locked), false);
  });
});

describe("API-Football polling cadence", () => {
  const match = { kickoff, finishedAt: null };

  it("polls live fixtures only around kickoff", () => {
    const live = { status: "IN_PLAY", observedAt: kickoff };
    assert.equal(shouldPollObservation(live, match, new Date(kickoff.getTime() - HOUR)), false);
    assert.equal(shouldPollObservation(live, match, new Date(kickoff.getTime() + HOUR)), true);
  });

  it("re-polls finished fixtures every 15 minutes for a day", () => {
    const finishedAt = new Date(kickoff.getTime() + 2 * HOUR);
    const obs = { status: "FINISHED", observedAt: finishedAt };
    const m = { kickoff, finishedAt };
    assert.equal(shouldPollObservation(obs, m, new Date(finishedAt.getTime() + 5 * 60_000)), false);
    assert.equal(shouldPollObservation(obs, m, new Date(finishedAt.getTime() + 20 * 60_000)), true);
    assert.equal(
      shouldPollObservation({ ...obs, observedAt: new Date(finishedAt.getTime() + 25 * HOUR) }, m, new Date(finishedAt.getTime() + 25.5 * HOUR)),
      false
    );
  });

  it("looks up the neighbouring UTC dates for late kickoffs", () => {
    assert.deepEqual(mappingDates(new Date("2031-06-05T23:00:00Z")), ["2031-06-05", "2031-06-06"]);
    assert.deepEqual(mappingDates(new Date("2031-06-05T01:00:00Z")), ["2031-06-05", "2031-06-04"]);
    assert.deepEqual(mappingDates(new Date("2031-06-05T12:00:00Z")), ["2031-06-05"]);
  });
});
