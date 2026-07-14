"use client";

import {
  AccaSummary,
  LegsList,
  RoundProgress,
  SubmitLegForm,
} from "@/components/group-ui";
import { RoundHistory } from "@/components/group-history";
import { useGroupData } from "@/context/group-data";
import { useSession } from "next-auth/react";
import { useState } from "react";

function formatCutoff(date: Date) {
  return date.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function GroupRoundPage() {
  const { data: session } = useSession();
  const { data, reload } = useGroupData();
  const [editing, setEditing] = useState(false);

  if (!data?.activeRound) return null;

  const userId = session?.user?.id;
  const { activeRound, group, betslipLink, betslipLinks } = data;
  const userLeg = activeRound.legs.find((l) => l.user.id === userId);
  const hasSubmitted = Boolean(userLeg);

  const isLocked = activeRound.status === "locked";
  const isOpen = activeRound.status === "open";
  const resolvedLegs = activeRound.legs.filter((l) => l.outcome !== "pending").length;

  // Picks can be edited until the first match in the acca kicks off.
  const firstKickoff =
    activeRound.legs.length > 0
      ? new Date(Math.min(...activeRound.legs.map((l) => new Date(l.kickoff).getTime())))
      : null;
  const editWindowOpen =
    (isOpen || isLocked) && (!firstKickoff || Date.now() < firstKickoff.getTime());
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
      {isOpen && (
        <RoundProgress
          members={group.members}
          legs={activeRound.legs}
          status={activeRound.status}
          firstKickoff={firstKickoff}
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
          bookmakerRankings={activeRound.accaBookmakerRankings ?? []}
          betslipLink={resolvedLegs === 0 ? betslipLink : null}
          showBookmakerCompare
          inProgress
        />
      )}

      {isOpen && userId && !hasSubmitted && (
        <SubmitLegForm roundId={activeRound.id} onSubmitted={reload} />
      )}

      {userLeg && editWindowOpen && !editing && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
          <div className="text-sm">
            <p className="font-medium">Your pick: {userLeg.selectionLabel} ({userLeg.odds})</p>
            <p className="mt-1 text-muted">
              You can change it until the first kickoff
              {firstKickoff ? ` — ${formatCutoff(firstKickoff)}` : ""}.
              {isLocked && " Changing a pick reprices the whole acca at current odds."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-accent-muted/30"
          >
            Change my pick
          </button>
        </div>
      )}

      {userLeg && editWindowOpen && editing && (
        <SubmitLegForm
          roundId={activeRound.id}
          editLegId={userLeg.id}
          onSubmitted={() => {
            setEditing(false);
            reload();
          }}
          onCancel={() => setEditing(false)}
        />
      )}

      <RoundHistory rounds={data.recentRounds} groupId={group.id} />
    </div>
  );
}
