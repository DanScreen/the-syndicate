import assert from "node:assert/strict";
import test from "node:test";
import type { OddsApiBookmaker, OddsApiEvent } from "./api-types";
import { buildOutrightMarket } from "./market-builders";
import { mapOutrightEventsToMarkets } from "./the-odds-api";

function outrightEvent(
  id: string,
  sportTitle: string,
  outcomes: [string, number][]
): OddsApiEvent {
  return {
    id,
    sport_title: sportTitle,
    bookmakers: [bookmaker("williamhill", "William Hill", outcomes)],
  } as unknown as OddsApiEvent;
}

function bookmaker(key: string, name: string, outcomes: [string, number][]): OddsApiBookmaker {
  return {
    key,
    title: name,
    markets: [
      {
        key: "outrights",
        outcomes: outcomes.map(([outcomeName, price]) => ({ name: outcomeName, price })),
      },
    ],
  } as OddsApiBookmaker;
}

test("orders outright selections by best available odds, favourite first", () => {
  const market = buildOutrightMarket(
    [
      bookmaker("williamhill", "William Hill", [
        ["Arsenal", 2.5],
        ["Aston Villa", 26],
        ["Liverpool", 3.1],
      ]),
    ],
    "outrights",
    "league_winner",
    "League Winner"
  );

  assert.ok(market);
  assert.deepEqual(
    market.selections.map((s) => s.label),
    ["Arsenal", "Liverpool", "Aston Villa"]
  );
});

test("merges quotes for the same entrant across bookmakers", () => {
  const market = buildOutrightMarket(
    [
      bookmaker("williamhill", "William Hill", [["Arsenal", 2.5]]),
      bookmaker("skybet", "Sky Bet", [["Arsenal", 2.75]]),
    ],
    "outrights",
    "league_winner",
    "League Winner"
  );

  assert.ok(market);
  assert.equal(market.selections.length, 1);
  assert.equal(market.selections[0]!.id, "arsenal");
  assert.equal(market.selections[0]!.odds.length, 2);
});

test("returns null when no bookmaker prices the outright market", () => {
  const market = buildOutrightMarket(
    [{ key: "skybet", title: "Sky Bet", markets: [] } as unknown as OddsApiBookmaker],
    "outrights",
    "league_winner",
    "League Winner"
  );

  assert.equal(market, null);
});

test("maps every outright event, not just the first", () => {
  const markets = mapOutrightEventsToMarkets(
    [
      outrightEvent("evt-1", "EPL Winner", [["Arsenal", 2.5]]),
      outrightEvent("evt-2", "EPL Top Goalscorer", [["Haaland", 3.0]]),
    ],
    "soccer_epl_winner"
  );

  assert.equal(markets.length, 2);
  assert.deepEqual(
    markets.map((m) => m.label),
    ["EPL Winner", "EPL Top Goalscorer"]
  );
  assert.deepEqual(
    markets.map((m) => m.type),
    ["outright_epl_winner", "outright_epl_top_goalscorer"]
  );
});

test("takes the market label from the feed rather than hardcoding league winner", () => {
  const markets = mapOutrightEventsToMarkets(
    [outrightEvent("evt-1", "Relegation", [["Burnley", 1.8]])],
    "soccer_epl_winner"
  );

  assert.equal(markets[0]!.label, "Relegation");
  assert.equal(markets[0]!.type, "outright_relegation");
});

test("falls back to the sport key when the event carries no title", () => {
  const event = outrightEvent("evt-1", "", [["Brazil", 5.0]]);
  const markets = mapOutrightEventsToMarkets([event], "soccer_fifa_world_cup_winner");

  assert.equal(markets[0]!.label, "Fifa World Cup Winner");
});

test("keeps market types unique when two events share a title", () => {
  const markets = mapOutrightEventsToMarkets(
    [
      outrightEvent("evt-1", "Winner", [["Arsenal", 2.5]]),
      outrightEvent("evt-2", "Winner", [["Liverpool", 3.0]]),
    ],
    "soccer_epl_winner"
  );

  assert.equal(markets.length, 2);
  assert.notEqual(markets[0]!.type, markets[1]!.type);
});
