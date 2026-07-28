import assert from "node:assert/strict";
import test from "node:test";
import {
  realQuotes,
  sortQuotesByBestOdds,
  sortQuotesForDisplay,
  topQuotes,
} from "./bookmakers";
import type { BookmakerQuote } from "./types";

const real = (id: string, odds: number): BookmakerQuote => ({
  bookmakerId: id,
  bookmakerName: id,
  odds,
});

const estimated = (id: string, odds: number): BookmakerQuote => ({
  bookmakerId: id,
  bookmakerName: id,
  odds,
  estimated: true,
});

test("realQuotes filters out anything flagged estimated", () => {
  const quotes = [real("a", 2.0), estimated("b", 2.5)];
  assert.deepEqual(
    realQuotes(quotes).map((q) => q.bookmakerId),
    ["a"]
  );
});

test("sortQuotesByBestOdds includes estimates, best odds first", () => {
  const quotes = [real("a", 2.0), estimated("b", 9.99)];
  const sorted = sortQuotesByBestOdds(quotes);
  assert.deepEqual(sorted.map((q) => q.bookmakerId), ["b", "a"]);
});

test("sortQuotesByBestOdds: a real quote wins a tie against an estimate", () => {
  const quotes = [estimated("est", 2.0), real("real", 2.0), estimated("est2", 2.0)];
  const sorted = sortQuotesByBestOdds(quotes);
  assert.equal(sorted[0]!.bookmakerId, "real");
});

test("topQuotes includes estimates", () => {
  const quotes = [real("a", 2.0), estimated("b", 9.99), real("c", 1.5)];
  const top = topQuotes(quotes, 5);
  assert.deepEqual(top.map((q) => q.bookmakerId), ["b", "a", "c"]);
});

test("sortQuotesForDisplay keeps estimates, real wins ties", () => {
  const quotes = [estimated("est", 2.0), real("real", 2.0), real("other", 1.5)];
  const sorted = sortQuotesForDisplay(quotes);
  assert.deepEqual(
    sorted.map((q) => q.bookmakerId),
    ["real", "est", "other"]
  );
});

test("sortQuotesForDisplay still ranks strictly-better estimates ahead when odds differ", () => {
  // Note: with a correctly-applied haircut this never happens in practice —
  // this only pins the sort comparator's own tie-break rule in isolation.
  const quotes = [real("real", 1.5), estimated("est", 2.0)];
  const sorted = sortQuotesForDisplay(quotes);
  assert.deepEqual(
    sorted.map((q) => q.bookmakerId),
    ["est", "real"]
  );
});
