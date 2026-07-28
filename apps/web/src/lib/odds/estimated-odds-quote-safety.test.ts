import assert from "node:assert/strict";
import test from "node:test";
import { sortQuotesByBestOdds } from "./bookmakers";
import { rankAccaBookmakers } from "./acca";
import type { BookmakerQuote } from "@tiki-acca/shared";

/**
 * Integration-level pin for the invariant in
 * docs/specs/estimated-odds-fill.md: leg creation (api/legs/route.ts:115),
 * round lock (lock-round.ts:72) and acca maths (acca.ts) all pick a quote via
 * `sortQuotesByBestOdds(selection.odds)[0]` — the exact one-liner reproduced
 * here. An estimate must never win that pick, even when it's numerically the
 * best price in the list (which a correctly-applied haircut should never
 * produce, but this test does not rely on the haircut to hold).
 */

test("leg-creation / lock-round quote pick never selects an estimate, even if it has the best odds", () => {
  const quotes: BookmakerQuote[] = [
    { bookmakerId: "coral", bookmakerName: "Coral", odds: 1.8 },
    // Deliberately the best price in the list, but flagged estimated.
    { bookmakerId: "williamhill", bookmakerName: "William Hill", odds: 9.99, estimated: true },
  ];

  // The exact expression used at apps/web/src/app/api/legs/route.ts:115 and
  // apps/web/src/lib/odds/lock-round.ts:72.
  const picked = sortQuotesByBestOdds(quotes)[0];

  assert.ok(picked);
  assert.equal(picked!.bookmakerId, "coral");
  assert.equal(picked!.estimated, undefined);
});

test("leg-creation quote pick returns undefined rather than an estimate when only estimates exist", () => {
  const quotes: BookmakerQuote[] = [
    { bookmakerId: "williamhill", bookmakerName: "William Hill", odds: 9.99, estimated: true },
  ];

  const picked = sortQuotesByBestOdds(quotes)[0];

  assert.equal(picked, undefined);
});

test("acca maths (rankAccaBookmakers) never ranks a bookmaker whose only quote on a leg is estimated", () => {
  const legs = [
    {
      quotes: [
        { bookmakerId: "coral", bookmakerName: "Coral", odds: 1.8 },
        { bookmakerId: "williamhill", bookmakerName: "William Hill", odds: 9.99, estimated: true },
      ] satisfies BookmakerQuote[],
    },
    {
      quotes: [{ bookmakerId: "coral", bookmakerName: "Coral", odds: 2.1 }] satisfies BookmakerQuote[],
    },
  ];

  const ranked = rankAccaBookmakers(legs);

  assert.ok(ranked.every((r) => r.bookmakerId !== "williamhill"));
  assert.deepEqual(
    ranked.map((r) => r.bookmakerId),
    ["coral"]
  );
});
