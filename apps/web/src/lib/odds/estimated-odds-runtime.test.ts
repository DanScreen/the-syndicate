import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { prisma } from "@tiki-acca/database";
import {
  estimatedOddsEffectivelyEnabled,
  getEstimatedOddsAdminToggle,
  setEstimatedOddsAdminToggle,
} from "./estimated-odds-runtime";

/**
 * Requires local PostgreSQL (docker compose up -d) — same as
 * create-additional-round.test.ts / propagate-selection-outcome.test.ts.
 *
 * Covers docs/specs/estimated-odds-fill.md §4's admin runtime toggle:
 * precedence (env AND admin toggle), persistence, and default state.
 */

const SETTING_KEY = "estimated_odds_enabled";
let previousRow: { value: string } | null = null;

before(async () => {
  previousRow = await prisma.platformSetting.findUnique({ where: { key: SETTING_KEY } });
});

after(async () => {
  if (previousRow) {
    await prisma.platformSetting.upsert({
      where: { key: SETTING_KEY },
      create: { key: SETTING_KEY, value: previousRow.value },
      update: { value: previousRow.value },
    });
  } else {
    await prisma.platformSetting.deleteMany({ where: { key: SETTING_KEY } });
  }
});

function withEnv(value: string | undefined, fn: () => Promise<void>) {
  const previous = process.env.ESTIMATED_ODDS_ENABLED;
  if (value === undefined) delete process.env.ESTIMATED_ODDS_ENABLED;
  else process.env.ESTIMATED_ODDS_ENABLED = value;
  return fn().finally(() => {
    if (previous === undefined) delete process.env.ESTIMATED_ODDS_ENABLED;
    else process.env.ESTIMATED_ODDS_ENABLED = previous;
  });
}

test("admin toggle defaults to on when no row exists", async () => {
  await prisma.platformSetting.deleteMany({ where: { key: SETTING_KEY } });
  assert.equal(await getEstimatedOddsAdminToggle(), true);
});

test("admin toggle persists across reads", async () => {
  await setEstimatedOddsAdminToggle(false);
  assert.equal(await getEstimatedOddsAdminToggle(), false);

  await setEstimatedOddsAdminToggle(true);
  assert.equal(await getEstimatedOddsAdminToggle(), true);
});

test("effective enablement requires both the env flag and the admin toggle", async () => {
  await withEnv("true", async () => {
    await setEstimatedOddsAdminToggle(true);
    assert.equal(await estimatedOddsEffectivelyEnabled(), true);

    await setEstimatedOddsAdminToggle(false);
    assert.equal(
      await estimatedOddsEffectivelyEnabled(),
      false,
      "toggle off must disable the fill even with the env flag on"
    );
  });
});

test("env flag off short-circuits regardless of the admin toggle", async () => {
  await withEnv(undefined, async () => {
    await setEstimatedOddsAdminToggle(true);
    assert.equal(await estimatedOddsEffectivelyEnabled(), false);
  });
});
