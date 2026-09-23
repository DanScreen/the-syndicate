import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatKickoff, legOutcomeLabel, mergeFixtureMarkets } from "./round-display";
import type { Market } from "./types";

describe("formatKickoff", () => {
  it("formats ISO strings and Dates the same way", () => {
    const iso = "2026-09-26T14:00:00.000Z";
    assert.equal(formatKickoff(iso), formatKickoff(new Date(iso)));
    assert.match(formatKickoff(iso), /Sat.*26.*Sep/);
  });
});

describe("legOutcomeLabel", () => {
  it("labels settled outcomes and treats anything else as awaiting", () => {
    assert.equal(legOutcomeLabel("won"), "Won");
    assert.equal(legOutcomeLabel("lost"), "Lost");
    assert.equal(legOutcomeLabel("void"), "Void");
    assert.equal(legOutcomeLabel("pending"), "Awaiting");
  });
});

describe("mergeFixtureMarkets", () => {
  it("keeps one market per type and prefers the extended market", () => {
    const market = (type: string, label: string): Market => ({ type, label, selections: [] });
    const merged = mergeFixtureMarkets(
      [market("h2h", "bulk"), market("totals", "bulk")],
      [market("h2h", "extended")]
    );
    assert.deepEqual(
      merged.map((m) => [m.type, m.label]),
      [
        ["h2h", "extended"],
        ["totals", "bulk"],
      ]
    );
  });
});
