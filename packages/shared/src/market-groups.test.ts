import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  asianHandicapLineFromType,
  decodeLineKey,
  embeddedOverUnderLineFromType,
  encodeLineKey,
  overUnderLineFromType,
  prefixedHandicapLineFromType,
} from "./market-groups";

describe("encodeLineKey", () => {
  it("always emits a tenths digit so whole lines are not read as tenths", () => {
    assert.equal(encodeLineKey(2), "20");
    assert.equal(encodeLineKey(10), "100");
    assert.equal(encodeLineKey(1), "10");
    assert.equal(encodeLineKey(-1), "m10");
  });

  it("keeps half-line and zero keys byte-identical to the legacy encoding", () => {
    assert.equal(encodeLineKey(0), "0");
    assert.equal(encodeLineKey(-0), "0");
    assert.equal(encodeLineKey(0.5), "05");
    assert.equal(encodeLineKey(-0.5), "m05");
    assert.equal(encodeLineKey(2.5), "25");
    assert.equal(encodeLineKey(-1.5), "m15");
    assert.equal(encodeLineKey(10.5), "105");
  });

  it("rejects quarter lines and non-finite values", () => {
    assert.equal(encodeLineKey(2.25), null);
    assert.equal(encodeLineKey(-0.75), null);
    assert.equal(encodeLineKey(Number.NaN), null);
  });

  it("round-trips every whole and half line through decodeLineKey", () => {
    for (let tenths = -150; tenths <= 150; tenths += 5) {
      const line = tenths / 10;
      const key = encodeLineKey(line);
      assert.ok(key, `line ${line} should encode`);
      assert.equal(decodeLineKey(key) + 0, line + 0, `line ${line} via "${key}"`);
    }
  });
});

describe("line parsers", () => {
  it("decode whole-number lines from market types", () => {
    assert.equal(overUnderLineFromType(`over_under_${encodeLineKey(2)}`), 2);
    assert.equal(overUnderLineFromType(`corners_over_under_${encodeLineKey(10)}`), 10);
    assert.equal(overUnderLineFromType(`cards_over_under_${encodeLineKey(4)}`), 4);
    assert.equal(asianHandicapLineFromType(`asian_handicap_${encodeLineKey(-1)}`), -1);
    assert.equal(prefixedHandicapLineFromType(`corners_handicap_${encodeLineKey(2)}`, "corners"), 2);
    assert.equal(embeddedOverUnderLineFromType(`player_shots__saka__${encodeLineKey(1)}`), 1);
  });

  it("still decode legacy half-line types", () => {
    assert.equal(overUnderLineFromType("over_under_25"), 2.5);
    assert.equal(asianHandicapLineFromType("asian_handicap_m05"), -0.5);
    assert.equal(asianHandicapLineFromType("asian_handicap_0"), 0);
  });
});
