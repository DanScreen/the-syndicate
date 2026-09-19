import { requireCronSecret } from "@/lib/internal-auth";
import { retryPendingRoundNotifications } from "@/lib/notifications/retry-pending-round-notifications";
import { lockOpenRoundsAtKickoff } from "@/lib/rounds/lock-open-rounds-at-kickoff";
import {
  autoSettleLockedRounds,
  resolvePendingLegsOnSettledRounds,
} from "@/lib/settlement/auto-settle-round";
import { reconcileRecentMatchOutcomes } from "@/lib/results/reconcile-match-legs";
import { syncAllCompetitionMatches } from "@/lib/results/sync-matches";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  if (!process.env.FOOTBALL_DATA_API_KEY) {
    return NextResponse.json(
      { error: "FOOTBALL_DATA_API_KEY is not configured" },
      { status: 503 }
    );
  }

  const sync = await syncAllCompetitionMatches();
  // After feed upserts: correct any leg outcomes that still disagree with the
  // Match score (late VAR / disallowed-goal corrections past the 1h window).
  const reconcile = await reconcileRecentMatchOutcomes();
  const kickoffLock = await lockOpenRoundsAtKickoff();
  const autoSettle = await autoSettleLockedRounds();
  const deferredLegs = await resolvePendingLegsOnSettledRounds();
  const notificationRetry = await retryPendingRoundNotifications();

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
    sync,
    reconcile,
    kickoffLock,
    autoSettle,
    deferredLegs,
    notificationRetry,
  });
}
