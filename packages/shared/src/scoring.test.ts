import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { effectiveAccaOdds, lockedPriceIncludesVoidLegs } from "./scoring";

const leg = (odds: number, outcome = "pending") => ({ odds, outcome });

describe("effectiveAccaOdds", () => {
  it("keeps the locked odds when no leg is void", () => {
    assert.equal(effectiveAccaOdds(7.8, [leg(2), leg(3.9)]), 7.8);
    assert.equal(effectiveAccaOdds(null, [leg(2)]), null);
  });

  it("drops a leg that went void after the acca was priced", () => {
    // Priced at 2 × 3 × 1.5 = 9; the 3.00 leg is postponed.
    assert.equal(effectiveAccaOdds(9, [leg(2), leg(3, "void"), leg(1.5, "won")]), 3);
  });

  it("keeps the stored odds of an acca re-locked without the void leg", () => {
    // Re-priced at the bookmaker's acca price over the two live legs.
    assert.equal(effectiveAccaOdds(3.05, [leg(2), leg(3, "void"), leg(1.5)]), 3.05);
  });

  it("pays 1.00 when every leg is void", () => {
    assert.equal(effectiveAccaOdds(6, [leg(2, "void"), leg(3, "void")]), 1);
  });

  it("prices an unlocked acca from the live legs", () => {
    assert.equal(effectiveAccaOdds(null, [leg(2), leg(3, "void")]), 2);
  });
});

describe("lockedPriceIncludesVoidLegs", () => {
  it("is true only when the stored price still includes a void leg", () => {
    assert.equal(lockedPriceIncludesVoidLegs(6, [leg(2), leg(3, "void")]), true);
    assert.equal(lockedPriceIncludesVoidLegs(2, [leg(2), leg(3, "void")]), false);
    assert.equal(lockedPriceIncludesVoidLegs(6, [leg(2), leg(3)]), false);
    assert.equal(lockedPriceIncludesVoidLegs(null, [leg(2), leg(3, "void")]), false);
  });
});
