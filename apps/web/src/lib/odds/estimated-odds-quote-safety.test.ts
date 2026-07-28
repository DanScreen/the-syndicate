import assert from "node:assert/strict";
import test from "node:test";
import { sortQuotesByBestOdds } from "./bookmakers";
import { rankAccaBookmakers } from "./acca";
import type { BookmakerQuote } from "@tiki-acca/shared";

/**
 * Estimated quotes now participate in every path (leg creation, round lock and
 * acca maths) via `sortQuotesByBestOdds(...)[0]`, per the product decision to
 * fill thin markets fully. The remaining guarantee is a preference, not an
 * exclusion: whenever a real quote sits at the best price, it is picked ahead
 * of an estimate at the same price, so a leg locks against a real bookmaker
 * price whenever one matches the best odds.
 */

test("a real quote wins the best-odds pick against an estimate at the same price", () => {
  const quotes: BookmakerQuote[] = [
    { bookmakerId: "williamhill", bookmakerName: "William Hill", odds: 1.9, estimated: true },
    { bookmakerId: "coral", bookmakerName: "Coral", odds: 1.9 },
  ];

  const picked = sortQuotesByBestOdds(quotes)[0];

  assert.ok(picked);
  assert.equal(picked!.bookmakerId, "coral");
  assert.equal(picked!.estimated, undefined);
});

test("an estimate is picked when it is the only quote at the best price", () => {
  const quotes: BookmakerQuote[] = [
    { bookmakerId: "coral", bookmakerName: "Coral", odds: 1.8 },
    { bookmakerId: "williamhill", bookmakerName: "William Hill", odds: 1.9, estimated: true },
  ];

  const picked = sortQuotesByBestOdds(quotes)[0];

  assert.ok(picked);
  assert.equal(picked!.bookmakerId, "williamhill");
  assert.equal(picked!.estimated, true);
});

test("acca maths (rankAccaBookmakers) ranks a bookmaker whose quote on a leg is estimated", () => {
  const legs = [
    {
      quotes: [
        { bookmakerId: "coral", bookmakerName: "Coral", odds: 1.8 },
        { bookmakerId: "williamhill", bookmakerName: "William Hill", odds: 1.8, estimated: true },
      ] satisfies BookmakerQuote[],
    },
    {
      quotes: [
        { bookmakerId: "coral", bookmakerName: "Coral", odds: 2.1 },
        { bookmakerId: "williamhill", bookmakerName: "William Hill", odds: 2.1 },
      ] satisfies BookmakerQuote[],
    },
  ];

  const ranked = rankAccaBookmakers(legs);
  const ids = ranked.map((r) => r.bookmakerId).sort();

  assert.deepEqual(ids, ["coral", "williamhill"]);
});
