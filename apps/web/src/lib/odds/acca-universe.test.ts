import assert from "node:assert/strict";
import test from "node:test";
import { rankAccaBookmakers, expandLegsToUniverse } from "./acca";
import type { BookmakerQuote } from "@tiki-acca/shared";

const real = (id: string, odds: number): BookmakerQuote => ({
  bookmakerId: id,
  bookmakerName: id,
  odds,
});

// Leg A covered by two books; leg B only by coral. Without expansion the acca
// intersection is just coral; with expansion, williamhill is filled on leg B
// with leg B's median so it spans both legs.
const legs = [
  { quotes: [real("coral", 2.0), real("williamhill", 1.8)] },
  { quotes: [real("coral", 3.0)] },
];

test("without expansion, only bookmakers on every leg are ranked", () => {
  const ranked = rankAccaBookmakers(legs);
  assert.deepEqual(
    ranked.map((r) => r.bookmakerId),
    ["coral"]
  );
});

test("with expandUniverse, a book present on any leg is ranked across all legs", () => {
  const ranked = rankAccaBookmakers(legs, { expandUniverse: true });
  const ids = ranked.map((r) => r.bookmakerId).sort();
  assert.deepEqual(ids, ["coral", "williamhill"]);

  // williamhill's leg B price is the median of leg B's real quotes (3.0),
  // so its combined = 1.8 * 3.0 = 5.4; coral = 2.0 * 3.0 = 6.0.
  const wh = ranked.find((r) => r.bookmakerId === "williamhill");
  assert.ok(wh);
  assert.equal(wh!.combinedOdds, 5.4);
});

test("expandLegsToUniverse leaves a leg with no real quotes untouched", () => {
  const withEstimateOnly = [
    { quotes: [{ bookmakerId: "coral", bookmakerName: "coral", odds: 2.0, estimated: true } as BookmakerQuote] },
    { quotes: [real("williamhill", 1.5)] },
  ];
  const expanded = expandLegsToUniverse(withEstimateOnly);
  // First leg had no real quotes — nothing to base a median on, so it is left as-is.
  assert.equal(expanded[0]!.quotes.length, 1);
});
