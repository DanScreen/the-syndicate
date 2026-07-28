import assert from "node:assert/strict";
import test from "node:test";
import {
  estimatedOddsEnabled,
  estimatedOddsMargin,
  estimatedOddsMinRealQuotes,
  estimatedOddsSkipAt,
} from "./config";
import { mapOddsEventToFixture } from "./the-odds-api";
import type { OddsApiEvent } from "./api-types";

/**
 * Ships dormant — see docs/specs/estimated-odds-fill.md. These pin the gate
 * shut (mirrors outrights-flag.test.ts) and pin that, with the flag off,
 * mapOddsEventToFixture's output is byte-identical to pre-estimated-odds
 * behaviour: no `fillEstimated` option means no estimates, ever.
 */

function withEnv(key: string, value: string | undefined, fn: () => void) {
  const previous = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
  try {
    fn();
  } finally {
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  }
}

test("estimated odds are off when the flag is unset", () => {
  withEnv("ESTIMATED_ODDS_ENABLED", undefined, () => assert.equal(estimatedOddsEnabled(), false));
});

test("estimated odds stay off for anything other than the exact string 'true'", () => {
  for (const value of ["false", "1", "yes", "TRUE", "True", ""]) {
    withEnv("ESTIMATED_ODDS_ENABLED", value, () =>
      assert.equal(estimatedOddsEnabled(), false, `expected off for ${JSON.stringify(value)}`)
    );
  }
});

test("estimated odds turn on only for an explicit 'true'", () => {
  withEnv("ESTIMATED_ODDS_ENABLED", "true", () => assert.equal(estimatedOddsEnabled(), true));
});

test("margin defaults to 0 (true median), honours an explicit 0, rejects negatives", () => {
  withEnv("ESTIMATED_ODDS_MARGIN", undefined, () => assert.equal(estimatedOddsMargin(), 0));
  withEnv("ESTIMATED_ODDS_MARGIN", "0", () => assert.equal(estimatedOddsMargin(), 0));
  withEnv("ESTIMATED_ODDS_MARGIN", "-0.2", () => assert.equal(estimatedOddsMargin(), 0));
  withEnv("ESTIMATED_ODDS_MARGIN", "not-a-number", () => assert.equal(estimatedOddsMargin(), 0));
});

test("an explicit positive margin still clamps to [0.01, 0.5]", () => {
  withEnv("ESTIMATED_ODDS_MARGIN", "0.001", () => assert.equal(estimatedOddsMargin(), 0.01));
  withEnv("ESTIMATED_ODDS_MARGIN", "0.9", () => assert.equal(estimatedOddsMargin(), 0.5));
  withEnv("ESTIMATED_ODDS_MARGIN", "0.12", () => assert.equal(estimatedOddsMargin(), 0.12));
});

test("min real quotes defaults to 1 and skip-at to 4", () => {
  withEnv("ESTIMATED_ODDS_MIN_REAL_QUOTES", undefined, () =>
    assert.equal(estimatedOddsMinRealQuotes(), 1)
  );
  withEnv("ESTIMATED_ODDS_SKIP_AT", undefined, () => assert.equal(estimatedOddsSkipAt(), 4));
});

function baseEvent(): OddsApiEvent {
  return {
    id: "evt1",
    sport_key: "soccer_test",
    sport_title: "Test League",
    commence_time: "2026-08-01T12:00:00Z",
    home_team: "Home FC",
    away_team: "Away FC",
    bookmakers: [
      {
        key: "coral",
        title: "Coral",
        link: undefined,
        markets: [
          {
            key: "h2h",
            link: undefined,
            outcomes: [
              { name: "Home FC", price: 2.0, link: undefined },
              { name: "Draw", price: 3.2, link: undefined },
              { name: "Away FC", price: 3.6, link: undefined },
            ],
          },
        ],
      },
      {
        key: "williamhill",
        title: "William Hill",
        link: undefined,
        markets: [
          {
            key: "h2h",
            link: undefined,
            outcomes: [
              { name: "Home FC", price: 1.9, link: undefined },
              { name: "Draw", price: 3.3, link: undefined },
              { name: "Away FC", price: 3.7, link: undefined },
            ],
          },
        ],
      },
    ],
  } as unknown as OddsApiEvent;
}

test("flag off: mapOddsEventToFixture output is byte-identical whether or not options are passed", () => {
  const withoutOptions = mapOddsEventToFixture(baseEvent());
  const withOptionsOff = mapOddsEventToFixture(baseEvent(), { fillEstimated: false });
  const withNoFillFlag = mapOddsEventToFixture(baseEvent());

  assert.deepEqual(withoutOptions, withNoFillFlag);
  assert.deepEqual(withoutOptions, withOptionsOff);

  // No estimated quotes anywhere in the output.
  for (const market of withoutOptions!.markets) {
    for (const selection of market.selections) {
      assert.ok(selection.odds.every((q) => !q.estimated));
    }
  }
});
