import assert from "node:assert/strict";
import test from "node:test";
import {
  asianHandicapLineFromType,
  embeddedOverUnderLineFromType,
  overUnderLineFromType,
  prefixedHandicapLineFromType,
} from "@tiki-acca/shared";
import type { OddsApiBookmaker, OddsApiEvent, OddsApiOutcome } from "./api-types";
import {
  buildAlternateSpreadsMarkets,
  buildAlternateTeamTotalsMarkets,
  buildAlternateTotalsMarkets,
  buildPlayerOverUnderMarkets,
  handicapMarketType,
  lineKey,
  overUnderMarketType,
} from "./market-builders";
import { mapOddsEventToFixture } from "./the-odds-api";

function bookmaker(key: string, outcomes: OddsApiOutcome[]): OddsApiBookmaker {
  return { key: "williamhill", title: "William Hill", markets: [{ key, outcomes }] };
}

function overUnder(point: number, description?: string): OddsApiOutcome[] {
  return [
    { name: "Over", price: 1.9, point, description },
    { name: "Under", price: 1.9, point, description },
  ];
}

const event: OddsApiEvent = {
  id: "evt",
  sport_title: "EPL",
  commence_time: "2099-01-01T15:00:00Z",
  home_team: "Arsenal",
  away_team: "Chelsea",
  bookmakers: [],
};

test("lineKey round-trips whole, half and negative lines", () => {
  assert.equal(lineKey(10), "100");
  assert.equal(lineKey(2), "20");
  assert.equal(lineKey(2.5), "25");
  assert.equal(lineKey(-1.5), "m15");
  assert.equal(lineKey(2.25), null);

  assert.equal(overUnderLineFromType(overUnderMarketType("", 2)!), 2);
  assert.equal(overUnderLineFromType(overUnderMarketType("corners", 10)!), 10);
  assert.equal(overUnderLineFromType(overUnderMarketType("cards", 3.5)!), 3.5);
  assert.equal(prefixedHandicapLineFromType(handicapMarketType("corners", -2)!, "corners"), -2);
  assert.equal(asianHandicapLineFromType(handicapMarketType("asian", 1)!), 1);
});

test("alternate totals encode whole lines and skip quarter lines", () => {
  const bookmakers = [
    bookmaker("alternate_totals_corners", [...overUnder(10), ...overUnder(9.5), ...overUnder(9.25)]),
  ];
  const markets = buildAlternateTotalsMarkets(
    bookmakers,
    "alternate_totals_corners",
    "corners",
    "Total Corners"
  );

  assert.deepEqual(
    markets.map((m) => [m.type, overUnderLineFromType(m.type), m.label]),
    [
      ["corners_over_under_95", 9.5, "Total Corners O/U 9.5"],
      ["corners_over_under_100", 10, "Total Corners O/U 10"],
    ]
  );
});

test("alternate spreads encode whole handicaps and skip quarter lines", () => {
  const bookmakers = [
    bookmaker("alternate_spreads_corners", [
      { name: "Arsenal", price: 1.9, point: -2 },
      { name: "Chelsea", price: 1.9, point: 2 },
      { name: "Arsenal", price: 1.9, point: -1.75 },
      { name: "Chelsea", price: 1.9, point: 1.75 },
    ]),
  ];
  const markets = buildAlternateSpreadsMarkets(
    event,
    bookmakers,
    "alternate_spreads_corners",
    "corners",
    "Corners Handicap"
  );

  assert.equal(markets.length, 1);
  assert.equal(markets[0]!.type, "corners_handicap_m20");
  assert.equal(markets[0]!.label, "Corners Handicap -2");
  assert.equal(prefixedHandicapLineFromType(markets[0]!.type, "corners"), -2);
  assert.deepEqual(
    markets[0]!.selections.map((s) => s.id),
    ["home_-2", "away_2"]
  );
});

test("player and team totals embed whole lines with a tenths digit", () => {
  const player = buildPlayerOverUnderMarkets(
    [bookmaker("player_shots", [...overUnder(1, "Bukayo Saka"), ...overUnder(1.25, "Bukayo Saka")])],
    "player_shots",
    "Shots"
  );
  assert.deepEqual(
    player.map((m) => m.type),
    ["player_shots__bukayo_saka__10"]
  );
  assert.equal(embeddedOverUnderLineFromType(player[0]!.type), 1);

  const team = buildAlternateTeamTotalsMarkets(
    [bookmaker("alternate_team_totals_corners", overUnder(5, "Arsenal"))],
    "alternate_team_totals_corners",
    "team_corners",
    "Team Corners"
  );
  assert.deepEqual(
    team.map((m) => m.type),
    ["team_corners__arsenal__50"]
  );
  assert.equal(embeddedOverUnderLineFromType(team[0]!.type), 5);
});

test("featured totals and spreads use the shared encoding", () => {
  const fixture = mapOddsEventToFixture({
    ...event,
    bookmakers: [
      {
        key: "williamhill",
        title: "William Hill",
        markets: [
          { key: "totals", outcomes: [...overUnder(3), ...overUnder(2.25)] },
          {
            key: "spreads",
            outcomes: [
              { name: "Arsenal", price: 1.9, point: -1 },
              { name: "Chelsea", price: 1.9, point: 1 },
              { name: "Arsenal", price: 1.9, point: -0.25 },
              { name: "Chelsea", price: 1.9, point: 0.25 },
            ],
          },
        ],
      },
    ],
  });
  assert.ok(fixture);

  const types = fixture.markets.map((m) => m.type).sort();
  assert.deepEqual(types, ["asian_handicap_m10", "over_under_30"]);
  assert.equal(overUnderLineFromType("over_under_30"), 3);
  assert.equal(asianHandicapLineFromType("asian_handicap_m10"), -1);
});
