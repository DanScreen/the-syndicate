import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bookmakerDomain, bookmakerLogoUrl } from "./bookmaker-branding";

describe("bookmaker branding", () => {
  it("maps Odds API sport888 to 888sport.com (not sport888.com)", () => {
    assert.equal(bookmakerDomain("sport888"), "888sport.com");
    const url = bookmakerLogoUrl("sport888", 64);
    assert.ok(url);
    assert.match(url!, /domain=888sport\.com/);
    assert.doesNotMatch(url!, /sport888\.com/);
  });

  it("keeps known UK bookmaker domains", () => {
    assert.equal(bookmakerDomain("bet365"), "bet365.com");
    assert.equal(bookmakerDomain("paddypower"), "paddypower.com");
  });
});
