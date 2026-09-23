import { requireCronSecret } from "@/lib/internal-auth";
import { retryPendingRoundNotifications } from "@/lib/notifications/retry-pending-round-notifications";
import { lockOpenRoundsAtKickoff } from "@/lib/rounds/lock-open-rounds-at-kickoff";
import {
  autoSettleLockedRounds,
  resolvePendingLegsOnSettledRounds,
} from "@/lib/settlement/auto-settle-round";
import { ensureMatchesForLockedLegs } from "@/lib/results/ensure-leg-matches";
import { isApiFootballConfigured } from "@/lib/results/providers/api-football";
import { reconcileRecentMatchOutcomes } from "@/lib/results/reconcile-match-legs";
import { syncApiFootballResults } from "@/lib/results/sync-api-football";
import { syncAllCompetitionMatches } from "@/lib/results/sync-matches";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const footballDataConfigured = Boolean(process.env.FOOTBALL_DATA_API_KEY);
  const apiFootballConfigured = isApiFootballConfigured();
  if (!footballDataConfigured && !apiFootballConfigured) {
    return NextResponse.json(
      { error: "No results feed configured (FOOTBALL_DATA_API_KEY / API_FOOTBALL_KEY)" },
      { status: 503 }
    );
  }

  // Locked legs → canonical Match rows, then each feed records its
  // observation and the Match is recomputed from their consensus.
  const ensureMatches = await ensureMatchesForLockedLegs();
  const sync = footballDataConfigured ? await syncAllCompetitionMatches() : null;
  const apiFootball = apiFootballConfigured ? await syncApiFootballResults() : null;
  // After feed upserts: correct any leg outcomes that still disagree with the
  // Match score (late VAR / disallowed-goal corrections past the 1h window).
  const reconcile = await reconcileRecentMatchOutcomes();
  const kickoffLock = await lockOpenRoundsAtKickoff();
  const autoSettle = await autoSettleLockedRounds();
  const deferredLegs = await resolvePendingLegsOnSettledRounds();
  const notificationRetry = await retryPendingRoundNotifications();

  if (apiFootball && (apiFootball.errors.length > 0 || apiFootball.requests > 0)) {
    console.info(
      "sync-matches: api-football",
      JSON.stringify({
        mapped: apiFootball.mapped,
        unmapped: apiFootball.unmapped,
        ambiguous: apiFootball.ambiguous,
        polled: apiFootball.polled,
        requests: apiFootball.requests,
        quotaRemaining: apiFootball.quotaRemaining,
        errors: apiFootball.errors,
      })
    );
  }

  if (kickoffLock.locked.length > 0) {
    console.info(
      "sync-matches: locked at kickoff",
      JSON.stringify(kickoffLock.locked)
    );
  }

  if (reconcile.matchesTouched > 0) {
    console.info(
      "sync-matches: reconciled feed score corrections",
      JSON.stringify(reconcile)
    );
  }

  if (autoSettle.pending.length > 0) {
    console.info(
      "sync-matches: auto-settle pending",
      JSON.stringify(autoSettle.pending)
    );
  }

  if (deferredLegs.awarded.length > 0) {
    console.info(
      "sync-matches: deferred leg awards",
      JSON.stringify(deferredLegs.awarded)
    );
  }

  return NextResponse.json({
    ensureMatches,
    sync,
    apiFootball,
    reconcile,
    kickoffLock,
    autoSettle,
    deferredLegs,
    notificationRetry,
  });
}
