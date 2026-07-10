"use client";

import {
  AccaSummary,
  LegsList,
  RoundHistory,
  RoundProgress,
  SettleRoundForm,
  SubmitLegForm,
} from "@/components/group-ui";
import { useGroupData } from "@/context/group-data";
import { formatLegPoints } from "@the-syndicate/shared";
import { useSession } from "next-auth/react";
import { useState } from "react";

export default function GroupRoundPage() {
  const { data: session } = useSession();
  const { data, reload } = useGroupData();
  const [actionLoading, setActionLoading] = useState(false);

  if (!data) return null;

  const userId = session?.user?.id;
  const { activeRound, group, isOwner, betslipLink, betslipLinks } = data;
  const hasSubmitted = activeRound?.legs.some((l) => l.user.id === userId);

  async function startRound() {
    setActionLoading(true);
    const res = await fetch(`/api/groups/${group.id}/rounds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: group.id }),
    });
    setActionLoading(false);
    if (res.ok) reload();
  }

  if (!activeRound) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6">
        <p className="text-sm text-muted">No active round.</p>
        {isOwner && (
          <button
            onClick={startRound}
            disabled={actionLoading}
            className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-green-400 disabled:opacity-50"
          >
            {actionLoading ? "Starting..." : "Start new round"}
          </button>
        )}
      </div>
    );
  }

  const isLocked = activeRound.status === "locked";
  const isCollecting = activeRound.status === "collecting";
  const resolvedLegs = activeRound.legs.filter((l) => l.outcome !== "pending").length;
  const lockedBookmakerName =
    activeRound.accaBookmakerRankings?.find(
      (r) => r.bookmakerId === activeRound.bestBookmakerId
    )?.bookmakerName ?? activeRound.legs[0]?.bookmakerName;

  let lockedBanner = "Acca locked — place your bet at the bookmaker";
  if (resolvedLegs > 0 && resolvedLegs < activeRound.legs.length) {
    lockedBanner = `Acca in progress — ${resolvedLegs} of ${activeRound.legs.length} legs settled`;
  } else if (resolvedLegs === activeRound.legs.length && activeRound.legs.length > 0) {
    lockedBanner = "All legs settled — acca will finalize shortly";
  }

  return (
    <div className="space-y-6">
      {isCollecting && (
        <RoundProgress
          members={group.members}
          legs={activeRound.legs}
          status={activeRound.status}
        />
      )}

      {isLocked && (
        <div className="rounded-lg border border-accent/30 bg-accent-muted/40 px-4 py-3 text-sm text-accent">
          {lockedBanner}
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold">Picks</h2>
        <div className="mt-3">
          <LegsList
            legs={activeRound.legs}
            legLinks={betslipLinks?.legLinks}
            showOpenLinks={isLocked && resolvedLegs === 0}
            inProgress={isLocked}
          />
        </div>
      </section>

      {isLocked && activeRound.combinedOdds && (
        <AccaSummary
          combinedOdds={activeRound.combinedOdds}
          bookmakerId={activeRound.bestBookmakerId}
          bookmakerName={lockedBookmakerName}
          singleBookmaker={Boolean(activeRound.bestBookmakerId)}
          betslipLink={resolvedLegs === 0 ? betslipLink : null}
          inProgress
        />
      )}

      {isCollecting && userId && !hasSubmitted && (
        <SubmitLegForm roundId={activeRound.id} onSubmitted={reload} />
      )}

      {isLocked && isOwner && (
        <SettleRoundForm round={activeRound} onSettled={reload} />
      )}

      {activeRound.status === "settled" && (
        <>
          <p className="text-sm">
            Round points:{" "}
            <span className="font-semibold text-accent">
              {formatLegPoints(
                activeRound.legs.reduce((sum, leg) => sum + (leg.pointsAwarded ?? 0), 0)
              )}{" "}
              pts
            </span>
          </p>
          {isOwner && (
            <button
              onClick={startRound}
              disabled={actionLoading}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-card"
            >
              Start next round
            </button>
          )}
        </>
      )}

      <RoundHistory rounds={data.recentRounds} />
    </div>
  );
}
