import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { footballDataReading, type FootballDataMatch } from "../football-data";
import { orientReading } from "../observations";
import { apiFootballReading, apiFootballStatus, type ApiFootballFixture } from "./api-football";

function afFixture(overrides: Partial<ApiFootballFixture> = {}): ApiFootballFixture {
  return {
    fixture: { id: 1208021, date: "2026-10-10T18:45:00+00:00", status: { short: "FT" } },
    league: { id: 5, season: 2026 },
    teams: { home: { id: 10, name: "Türkiye" }, away: { id: 20, name: "Wales" } },
    goals: { home: 2, away: 1 },
    score: {
      halftime: { home: 1, away: 1 },
      fulltime: { home: 2, away: 1 },
      extratime: { home: null, away: null },
      penalty: { home: null, away: null },
    },
    statistics: [
      {
        team: { id: 10 },
        statistics: [
          { type: "Corner Kicks", value: 7 },
          { type: "Yellow Cards", value: 2 },
          { type: "Red Cards", value: null },
        ],
      },
      {
        team: { id: 20 },
        statistics: [
          { type: "Corner Kicks", value: 3 },
          { type: "Yellow Cards", value: 4 },
          { type: "Red Cards", value: 1 },
        ],
      },
    ],
    ...overrides,
  };
}

describe("API-Football reading", () => {
  it("maps status codes to football-data vocabulary", () => {
    assert.equal(apiFootballStatus("FT"), "FINISHED");
    assert.equal(apiFootballStatus("AET"), "FINISHED");
    assert.equal(apiFootballStatus("PEN"), "FINISHED");
    assert.equal(apiFootballStatus("HT"), "PAUSED");
    assert.equal(apiFootballStatus("2H"), "IN_PLAY");
    assert.equal(apiFootballStatus("PST"), "POSTPONED");
    assert.equal(apiFootballStatus("ABD"), "SUSPENDED");
    assert.equal(apiFootballStatus("NS"), "SCHEDULED");
  });

  it("reads the 90' score, half-time and corners", () => {
    const r = apiFootballReading(afFixture());
    assert.equal(r.status, "FINISHED");
    assert.deepEqual([r.homeGoals90, r.awayGoals90], [2, 1]);
    assert.deepEqual([r.homeGoalsHt, r.awayGoalsHt], [1, 1]);
    assert.deepEqual(r.stats?.corners, { home: 7, away: 3 });
    assert.deepEqual(r.stats?.yellowCards, { home: 2, away: 4 });
    // A null stat is "not reported", never zero.
    assert.equal(r.stats?.redCards, null);
    assert.equal(r.extraTime, false);
  });

  it("keeps the 90' score apart from extra-time goals", () => {
    const r = apiFootballReading(
      afFixture({
        fixture: { id: 1, date: "2026-10-10T18:45:00+00:00", status: { short: "AET" } },
        goals: { home: 2, away: 1 },
        score: {
          halftime: { home: 0, away: 0 },
          fulltime: { home: 1, away: 1 },
          extratime: { home: 1, away: 0 },
        },
      })
    );
    assert.deepEqual([r.homeGoals90, r.awayGoals90], [1, 1]);
    assert.deepEqual([r.homeGoalsEnd, r.awayGoalsEnd], [2, 1]);
    assert.equal(r.extraTime, true);
  });

  it("uses the running score while live", () => {
    const r = apiFootballReading(
      afFixture({
        fixture: { id: 1, date: "2026-10-10T18:45:00+00:00", status: { short: "2H" } },
        goals: { home: 1, away: 0 },
        score: { halftime: { home: 1, away: 0 }, fulltime: { home: null, away: null } },
        statistics: undefined,
      })
    );
    assert.equal(r.status, "IN_PLAY");
    assert.deepEqual([r.homeGoals90, r.awayGoals90], [1, 0]);
    assert.equal(r.stats, null);
  });

  it("swaps every field when the provider lists the fixture reversed", () => {
    const r = orientReading(apiFootballReading(afFixture()), true);
    assert.deepEqual([r.homeGoals90, r.awayGoals90], [1, 2]);
    assert.deepEqual([r.homeGoalsHt, r.awayGoalsHt], [1, 1]);
    assert.deepEqual(r.stats?.corners, { home: 3, away: 7 });
  });
});

describe("football-data reading", () => {
  function fd(score: FootballDataMatch["score"], status = "FINISHED"): FootballDataMatch {
    return {
      id: 1,
      utcDate: "2026-10-10T18:45:00Z",
      status,
      homeTeam: { name: "Arsenal FC" },
      awayTeam: { name: "Chelsea FC" },
      score,
    };
  }

  it("uses fullTime for a regular match", () => {
    const r = footballDataReading(
      fd({ duration: "REGULAR", fullTime: { home: 3, away: 0 }, halfTime: { home: 1, away: 0 } })
    );
    assert.deepEqual([r.homeGoals90, r.awayGoals90], [3, 0]);
    assert.deepEqual([r.homeGoalsHt, r.awayGoalsHt], [1, 0]);
  });

  it("uses regularTime after extra time", () => {
    const r = footballDataReading(
      fd({
        duration: "EXTRA_TIME",
        fullTime: { home: 2, away: 1 },
        regularTime: { home: 1, away: 1 },
      })
    );
    assert.deepEqual([r.homeGoals90, r.awayGoals90], [1, 1]);
    assert.equal(r.extraTime, true);
  });

  it("abstains (null 90') after extra time without a regularTime split", () => {
    const r = footballDataReading(
      fd({ duration: "PENALTY_SHOOTOUT", fullTime: { home: 5, away: 4 } })
    );
    assert.equal(r.homeGoals90, null);
    assert.equal(r.awayGoals90, null);
  });
});
