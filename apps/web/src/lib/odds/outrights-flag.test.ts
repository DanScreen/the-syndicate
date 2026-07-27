import assert from "node:assert/strict";
import test from "node:test";
import { outrightsEnabled } from "./config";

/**
 * The outright plumbing ships complete but dormant — see docs/ODDS_PROVIDERS.md.
 * These pin the gate shut so it can't be opened by accident: `getOutrightFixture`
 * returns null when disabled, which is the single choke point for the web picker,
 * the mobile picker and leg creation alike.
 */

function withEnv(value: string | undefined, fn: () => void) {
  const previous = process.env.OUTRIGHTS_ENABLED;
  if (value === undefined) delete process.env.OUTRIGHTS_ENABLED;
  else process.env.OUTRIGHTS_ENABLED = value;
  try {
    fn();
  } finally {
    if (previous === undefined) delete process.env.OUTRIGHTS_ENABLED;
    else process.env.OUTRIGHTS_ENABLED = previous;
  }
}

test("outrights are off when the flag is unset", () => {
  withEnv(undefined, () => assert.equal(outrightsEnabled(), false));
});

test("outrights stay off for anything other than the exact string 'true'", () => {
  for (const value of ["false", "1", "yes", "TRUE", "True", ""]) {
    withEnv(value, () =>
      assert.equal(outrightsEnabled(), false, `expected off for ${JSON.stringify(value)}`)
    );
  }
});

test("outrights turn on only for an explicit 'true'", () => {
  withEnv("true", () => assert.equal(outrightsEnabled(), true));
});
