import assert from "node:assert/strict";
import test from "node:test";
import { fillEstimatedQuotes } from "./estimated-odds";
import type { BookmakerQuote, MarketSelection } from "./types";

function quote(bookmakerId: string, odds: number, extra?: Partial<BookmakerQuote>): BookmakerQuote {
  return { bookmakerId, bookmakerName: bookmakerId, odds, ...extra };
}

function selection(odds: BookmakerQuote[]): MarketSelection {
  return { id: "yes", label: "Yes", odds };
}

const OPTS = { margin: 0.05, minRealQuotes: 2, skipAt: 4 };

test("median of 2 real quotes is their midpoint", () => {
  const s = selection([quote("a", 2.0), quote("b", 3.0)]);
  const filled = fillEstimatedQuotes(s, [{ id: "a", name: "a" }, { id: "b", name: "b" }, { id: "c", name: "c" }], OPTS);
  const estimate = filled.odds.find((q) => q.bookmakerId === "c");
  // median(2.0, 3.0) = 2.5; haircut 0.05 -> 2.375 -> rounds to 2.38 (banker-free round-half-up)
  assert.ok(estimate);
  assert.equal(estimate!.odds, 2.38);
});

test("median of 3 real quotes is the middle value", () => {
  const s = selection([quote("a", 1.5), quote("b", 3.0), quote("c", 2.0)]);
  const filled = fillEstimatedQuotes(
    s,
    [{ id: "a", name: "a" }, { id: "b", name: "b" }, { id: "c", name: "c" }, { id: "d", name: "d" }],
    OPTS
  );
  const estimate = filled.odds.find((q) => q.bookmakerId === "d");
  // median(1.5, 2.0, 3.0) = 2.0; haircut -> 1.9
  assert.ok(estimate);
  assert.equal(estimate!.odds, 1.9);
});

test("median of an even count averages the middle two", () => {
  const s = selection([quote("a", 1.0), quote("b", 2.0), quote("c", 3.0), quote("d", 4.0)]);
  const filled = fillEstimatedQuotes(
    s,
    [
      { id: "a", name: "a" },
      { id: "b", name: "b" },
      { id: "c", name: "c" },
      { id: "d", name: "d" },
    ],
    { margin: 0.05, minRealQuotes: 2, skipAt: 5 }
  );
  // 4 real quotes already fills every candidate bookmaker — nothing left to
  // estimate, but the median math (middle two averaged: (2+3)/2=2.5) is
  // exercised again below with a spare candidate bookmaker.
  assert.equal(filled.odds.length, 4);

  const s2 = selection([quote("a", 1.0), quote("b", 2.0), quote("c", 3.0), quote("d", 4.0)]);
  const filled2 = fillEstimatedQuotes(
    s2,
    [
      { id: "a", name: "a" },
      { id: "b", name: "b" },
      { id: "c", name: "c" },
      { id: "d", name: "d" },
      { id: "e", name: "e" },
    ],
    { margin: 0.05, minRealQuotes: 2, skipAt: 5 }
  );
  const estimate = filled2.odds.find((q) => q.bookmakerId === "e");
  // median(1,2,3,4) = 2.5; haircut 0.05 -> 2.375 -> 2.38 (JS round-half-up on positives)
  assert.ok(estimate);
  assert.equal(estimate!.odds, 2.38);
});

test("haircut direction: estimate is below the median, never above", () => {
  const s = selection([quote("a", 2.0), quote("b", 2.0)]);
  const filled = fillEstimatedQuotes(s, [{ id: "a", name: "a" }, { id: "b", name: "b" }, { id: "c", name: "c" }], OPTS);
  const estimate = filled.odds.find((q) => q.bookmakerId === "c");
  assert.ok(estimate);
  // median 2.00 x 0.95 = 1.90, not 2.10
  assert.equal(estimate!.odds, 1.9);
});

test("never-top invariant: no estimate ever exceeds the best real quote", () => {
  const rng = mulberry32(42);
  for (let trial = 0; trial < 200; trial++) {
    const count = 2 + Math.floor(rng() * 3); // 2..4 real quotes
    const reals = Array.from({ length: count }, (_, i) =>
      quote(`real${i}`, Number((1.01 + rng() * 10).toFixed(2)))
    );
    const margin = 0.01 + rng() * 0.49; // (0, 0.5]
    const s = selection(reals);
    const eventBookmakers = [
      ...reals.map((q) => ({ id: q.bookmakerId, name: q.bookmakerId })),
      { id: "spare", name: "spare" },
    ];
    const filled = fillEstimatedQuotes(s, eventBookmakers, {
      margin,
      minRealQuotes: 2,
      skipAt: 5,
    });
    const bestReal = Math.max(...reals.map((q) => q.odds));
    for (const q of filled.odds) {
      if (q.estimated) {
        assert.ok(
          q.odds <= bestReal,
          `estimate ${q.odds} exceeded best real ${bestReal} (margin ${margin})`
        );
      }
    }
  }
});

test("candidate set: only fixture-covering retail books get an estimate", () => {
  const s = selection([quote("a", 2.0), quote("b", 2.5)]);
  const filled = fillEstimatedQuotes(
    s,
    [
      { id: "a", name: "a" },
      { id: "b", name: "b" },
      { id: "c", name: "c" }, // covers fixture, no real quote -> estimate
      { id: "betfair_ex_uk", name: "Betfair Exchange" }, // exchange -> never estimated
    ],
    OPTS
  );
  const estimatedIds = filled.odds.filter((q) => q.estimated).map((q) => q.bookmakerId);
  assert.deepEqual(estimatedIds, ["c"]);
});

test("candidate set: no estimate for a bookmaker that already has a real quote", () => {
  const s = selection([quote("a", 2.0), quote("b", 2.5)]);
  const filled = fillEstimatedQuotes(s, [{ id: "a", name: "a" }, { id: "b", name: "b" }], OPTS);
  assert.equal(filled.odds.filter((q) => q.estimated).length, 0);
});

test("no invented coverage: a bookmaker absent from the fixture never gets an estimate", () => {
  const s = selection([quote("a", 2.0), quote("b", 2.5)]);
  const filled = fillEstimatedQuotes(s, [{ id: "a", name: "a" }, { id: "b", name: "b" }], OPTS);
  assert.ok(!filled.odds.some((q) => q.bookmakerId === "never-quoted-this-fixture"));
});

test("estimated quotes never carry a link", () => {
  const s = selection([quote("a", 2.0), quote("b", 2.5)]);
  const filled = fillEstimatedQuotes(s, [{ id: "a", name: "a" }, { id: "b", name: "b" }, { id: "c", name: "c" }], OPTS);
  const estimate = filled.odds.find((q) => q.bookmakerId === "c");
  assert.ok(estimate);
  assert.equal(estimate!.link, undefined);
});

test("skip threshold: no fill at or above skipAt real quotes", () => {
  const s = selection([quote("a", 2.0), quote("b", 2.1), quote("c", 2.2), quote("d", 2.3)]);
  const filled = fillEstimatedQuotes(
    s,
    [
      { id: "a", name: "a" },
      { id: "b", name: "b" },
      { id: "c", name: "c" },
      { id: "d", name: "d" },
      { id: "e", name: "e" },
    ],
    { margin: 0.05, minRealQuotes: 2, skipAt: 4 }
  );
  assert.equal(filled.odds.length, 4);
});

test("minimum threshold: no fill below minRealQuotes", () => {
  const s = selection([quote("a", 2.0)]);
  const filled = fillEstimatedQuotes(
    s,
    [{ id: "a", name: "a" }, { id: "b", name: "b" }],
    { margin: 0.05, minRealQuotes: 2, skipAt: 4 }
  );
  assert.equal(filled.odds.length, 1);
});

test("floor: an estimate never drops below 1.01", () => {
  const s = selection([quote("a", 1.01), quote("b", 1.01)]);
  const filled = fillEstimatedQuotes(s, [{ id: "a", name: "a" }, { id: "b", name: "b" }, { id: "c", name: "c" }], {
    margin: 0.5,
    minRealQuotes: 2,
    skipAt: 4,
  });
  const estimate = filled.odds.find((q) => q.bookmakerId === "c");
  assert.ok(estimate);
  assert.equal(estimate!.odds, 1.01);
});

/** Deterministic PRNG so the property-style test is reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
