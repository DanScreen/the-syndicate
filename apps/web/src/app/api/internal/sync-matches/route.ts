import { requireCronSecret } from "@/lib/internal-auth";
import { retryPendingRoundNotifications } from "@/lib/notifications/retry-pending-round-notifications";
import { lockOpenRoundsAtKickoff } from "@/lib/rounds/lock-open-rounds-at-kickoff";
import { autoSettleLockedRounds } from "@/lib/settlement/auto-settle-round";
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
  const kickoffLock = await lockOpenRoundsAtKickoff();
  const autoSettle = await autoSettleLockedRounds();
  const notificationRetry = await retryPendingRoundNotifications();

  if (kickoffLock.locked.length > 0) {
    console.info(
      "sync-matches: locked at kickoff",
      JSON.stringify(kickoffLock.locked)
    );
  }

  if (autoSettle.pending.length > 0) {
    console.info(
      "sync-matches: auto-settle pending",
      JSON.stringify(autoSettle.pending)
    );
  }

  return NextResponse.json({ sync, kickoffLock, autoSettle, notificationRetry });
}
