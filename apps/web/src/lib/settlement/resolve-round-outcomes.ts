import { postLegResultMessage } from "@/lib/chat/system-messages";
import { getMatchResultForLegFromDb } from "@/lib/results/match-store";
import {
  isMatchResultConfirmed,
  isResultHeldForReview,
} from "@/lib/results/result-confirmation";
import { isCornersMarket, resolveLegOutcome } from "@/lib/results/resolve-leg";
import { prisma } from "@tiki-acca/database";
import type { Leg } from "@prisma/client";
import {
  formatFixtureLabel,
  isOutrightFixtureId,
  RESULT_CONFIRMATION_MS,
  STATS_CONFIRMATION_MS,
  type LegOutcome,
} from "@tiki-acca/shared";

export type PendingLeg = { legId: string; reason: string };

/**
 * `resolved` includes provisional outcomes: legs on a FINISHED match whose FT
 * score is not yet confirmed. They may be written to the leg (members see the
 * result straight away; reconcile corrects them if the feed changes), but must
 * not settle the round — `provisional` lists them, and they also appear in
 * `pending`.
 */
export type ResolveRoundResult =
  | { ready: true; outcomeMap: Map<string, LegOutcome> }
  | {
      ready: false;
      pending: PendingLeg[];
      resolved: Map<string, LegOutcome>;
      provisional: Set<string>;
    };

function cornersPendingReason(leg: Leg, extraTime: boolean, hasStats: boolean): string {
  if (extraTime) {
    return `${formatFixtureLabel(leg)} went to extra time — corners leg needs manual settlement`;
  }
  if (!hasStats) {
    return `No corners stats yet for ${formatFixtureLabel(leg)} — settle by hand if the provider has none`;
  }
  const hours = Math.round(STATS_CONFIRMATION_MS / 3_600_000);
  return `Corners for ${formatFixtureLabel(leg)} — waiting for match stats to stay unchanged for ${hours}h`;
}

export async function resolveRoundOutcomes(
  legs: Leg[]
): Promise<ResolveRoundResult> {
  const outcomeMap = new Map<string, LegOutcome>();
  const pending: PendingLeg[] = [];
  const provisional = new Set<string>();

  for (const leg of legs) {
    // Outrights have no match behind them and no feed that reports a league
    // winner — an admin enters the result once the season finishes.
    if (isOutrightFixtureId(leg.fixtureId)) {
      pending.push({
        legId: leg.id,
        reason: `${formatFixtureLabel(leg)} — outright, awaiting manual settlement at season end`,
      });
      continue;
    }

    // Void is sticky: a postponed match that is later rescheduled doesn't
    // bring the pick back (correct-leg-outcome is the admin override).
    if (leg.outcome === "void") {
      outcomeMap.set(leg.id, "void");
      continue;
    }

    const matchData = await getMatchResultForLegFromDb({
      id: leg.id,
      matchId: leg.matchId,
      competitionId: leg.competitionId,
      homeTeam: leg.homeTeam,
      awayTeam: leg.awayTeam,
      kickoff: leg.kickoff,
    });

    if (!matchData) {
      pending.push({
        legId: leg.id,
        reason: `No synced match for ${formatFixtureLabel(leg)} (${leg.competition})`,
      });
      continue;
    }

    // Results providers disagree (or none has a 90' score) — admin decides.
    if (isResultHeldForReview(matchData.match)) {
      pending.push({
        legId: leg.id,
        reason:
          matchData.match.resultSource === "conflict"
            ? `Results sources disagree for ${formatFixtureLabel(leg)} — check /admin/results`
            : `No 90-minute score for ${formatFixtureLabel(leg)} — check /admin/results`,
      });
      continue;
    }

    const outcome = resolveLegOutcome(
      {
        marketType: leg.marketType,
        selectionId: leg.selectionId,
        homeTeam: leg.homeTeam,
        awayTeam: leg.awayTeam,
      },
      matchData.result
    );

    if (!outcome) {
      pending.push({
        legId: leg.id,
        reason:
          matchData.result.status !== "FINISHED"
            ? `Match not finished (${matchData.result.status})`
            : isCornersMarket(leg.marketType)
              ? cornersPendingReason(
                  leg,
                  matchData.result.extraTime === true,
                  matchData.match.stats !== null
                )
              : `Could not resolve ${leg.marketType} (${leg.selectionId})`,
      });
      continue;
    }

    outcomeMap.set(leg.id, outcome);

    // Provisional until the FT score has been stable long enough (disallowed
    // goals / VAR corrections reset the stability clock).
    if (!isMatchResultConfirmed(matchData.match)) {
      const mins = Math.ceil(RESULT_CONFIRMATION_MS / 60_000);
      provisional.add(leg.id);
      pending.push({
        legId: leg.id,
        reason: `Result confirming for ${formatFixtureLabel(leg)} — ${outcome} provisionally; round settles once the FT score stays unchanged for ${mins}m`,
      });
    }
  }

  if (pending.length > 0) {
    return { ready: false, pending, resolved: outcomeMap, provisional };
  }

  return { ready: true, outcomeMap };
}

/**
 * Update leg outcomes as matches finish.
 * Points for a busted acca may already be partly awarded; unfinished legs
 * keep `pending` until deferred resolution after early settle.
 */
export async function persistResolvableLegOutcomes(
  legs: Leg[],
  outcomeMap: Map<string, LegOutcome>
): Promise<number> {
  let updated = 0;

  for (const leg of legs) {
    const outcome = outcomeMap.get(leg.id);
    if (!outcome || outcome === "pending" || leg.outcome !== "pending") continue;

    // Atomic pending → outcome claim: overlapping cron runs (or a concurrent
    // settlement) match zero rows, so the leg_result chat message posts
    // exactly once, in the same transaction as the claim.
    const claimed = await prisma.$transaction(async (tx) => {
      const claim = await tx.leg.updateMany({
        where: { id: leg.id, outcome: "pending" },
        data: { outcome },
      });
      if (claim.count === 0) return false;
      await postLegResultMessage(tx, leg, outcome);
      return true;
    });

    if (claimed) updated++;
  }

  return updated;
}
