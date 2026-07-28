import { prisma } from "@tiki-acca/database";
import { estimatedOddsEnabled } from "./config";

/**
 * Admin runtime toggle for the estimated-odds fill (see
 * docs/specs/estimated-odds-fill.md §4). This sits *alongside* the
 * `ESTIMATED_ODDS_ENABLED` env var, not instead of it:
 *
 *   effective enablement = ESTIMATED_ODDS_ENABLED (env) AND admin toggle (DB)
 *
 * The env var stays the deploy-level kill switch / default-off gate; once
 * it's `"true"`, the admin toggle controls the fill at runtime without a
 * redeploy. With no row yet, the toggle defaults to "on" so the env var alone
 * governs behaviour until an admin deliberately switches it off.
 */
const ESTIMATED_ODDS_SETTING_KEY = "estimated_odds_enabled";

export async function getEstimatedOddsAdminToggle(): Promise<boolean> {
  const row = await prisma.platformSetting.findUnique({
    where: { key: ESTIMATED_ODDS_SETTING_KEY },
  });
  if (!row) return true;
  return row.value === "true";
}

export async function setEstimatedOddsAdminToggle(enabled: boolean): Promise<boolean> {
  await prisma.platformSetting.upsert({
    where: { key: ESTIMATED_ODDS_SETTING_KEY },
    create: { key: ESTIMATED_ODDS_SETTING_KEY, value: enabled ? "true" : "false" },
    update: { value: enabled ? "true" : "false" },
  });
  return enabled;
}

/**
 * Effective enablement checked at market-build time (the same choke point
 * that gates the fill itself): env flag AND admin toggle. Short-circuits on
 * the env flag to avoid a DB round trip when the feature is off at the
 * deploy level. Odds are cached/stored in snapshots, so a toggle flip takes
 * effect on the next refresh (cron warm or on-demand fetch), not instantly
 * for already-cached reads.
 */
export async function estimatedOddsEffectivelyEnabled(): Promise<boolean> {
  if (!estimatedOddsEnabled()) return false;
  return getEstimatedOddsAdminToggle();
}
