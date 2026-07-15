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
  const [editingLegId, setEditingLegId] = useState<string | null>(null);

  if (!data?.activeRound) return null;

  const userId = session?.user?.id;
  const { activeRound, group, betslipLink, betslipLinks } = data;
  const legsPerMember = activeRound.legsPerMember ?? group.legsPerMember ?? 1;
  const userLegs = activeRound.legs.filter((l) => l.user.id === userId);
  const canSubmitMore =
    Boolean(userId) &&
    activeRound.status === "open" &&
    userLegs.length < legsPerMember;

  const isLocked = activeRound.status === "locked";
  const isOpen = activeRound.status === "open";
  const resolvedLegs = activeRound.legs.filter((l) => l.outcome !== "pending").length;

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

  const rankings = activeRound.accaBookmakerRankings ?? [];
  const combinedOdds =
    activeRound.combinedOdds ?? rankings[0]?.combinedOdds ?? null;
  const bestBookmakerId =
    activeRound.bestBookmakerId ?? rankings[0]?.bookmakerId ?? null;
  const bookmakerName =
    rankings.find((r) => r.bookmakerId === bestBookmakerId)?.bookmakerName ??
    lockedBookmakerName;
  const showAccaSummary =
    Boolean(combinedOdds) &&
    (isLocked || (isOpen && activeRound.legs.length > 0 && rankings.length > 0));

  const nextSlot = userLegs.length + 1;

  return (
    <div className="space-y-6">
      {isOpen && (
        <RoundProgress
          members={group.members}
          legs={activeRound.legs}
          status={activeRound.status}
          firstKickoff={firstKickoff}
          legsPerMember={legsPerMember}
        />
      )}

      {isLocked && (
        <div className="rounded-lg border border-accent/30 bg-accent-muted/40 px-4 py-3 text-sm text-accent">
          {lockedBanner}
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold">Picks</h2>
        {legsPerMember > 1 && (
          <p className="mt-1 text-sm text-muted">
            {legsPerMember} legs each this round
          </p>
        )}
        <div className="mt-3">
          <LegsList
            legs={activeRound.legs}
            legLinks={betslipLinks?.legLinks}
            showOpenLinks={isLocked && resolvedLegs === 0}
            inProgress={isLocked}
            showLegIndex={legsPerMember > 1}
          />
        </div>
      </section>

      {showAccaSummary && combinedOdds != null && (
        <AccaSummary
          combinedOdds={combinedOdds}
          bookmakerId={bestBookmakerId}
          bookmakerName={bookmakerName}
          singleBookmaker={Boolean(bestBookmakerId)}
          bookmakerRankings={rankings}
          betslipLink={isLocked && resolvedLegs === 0 ? betslipLink : isOpen ? betslipLink : null}
          betslipLinkQuality={betslipLinks?.primaryLinkQuality ?? null}
          betslipHasAllLegLinks={betslipLinks?.primaryHasAllLegLinks ?? false}
          legCount={activeRound.legs.length}
          showBookmakerCompare={isOpen}
          inProgress={isLocked}
          preview={isOpen}
        />
      )}

      {canSubmitMore && !editingLegId && (
        <SubmitLegForm
          roundId={activeRound.id}
          onSubmitted={reload}
          title={
            legsPerMember > 1
              ? `Submit leg ${nextSlot} of ${legsPerMember}`
              : undefined
          }
        />
      )}

      {userLegs.length > 0 && editWindowOpen && !editingLegId && (
        <div className="space-y-2 rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-medium">Your picks</p>
          <p className="text-sm text-muted">
            You can change them until the first kickoff
            {firstKickoff ? ` — ${formatCutoff(firstKickoff)}` : ""}.
            {isLocked && " Changing a pick reprices the whole acca at current odds."}
          </p>
          <ul className="mt-2 space-y-2">
            {userLegs.map((leg) => (
              <li
                key={leg.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span>
                  {legsPerMember > 1 ? `Leg ${leg.legIndex ?? ""}: ` : ""}
                  {leg.selectionLabel} ({leg.odds})
                </span>
                <button
                  type="button"
                  onClick={() => setEditingLegId(leg.id)}
                  className="rounded-lg border border-accent px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent-muted/30"
                >
                  Change
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {editingLegId && editWindowOpen && (
        <SubmitLegForm
          roundId={activeRound.id}
          editLegId={editingLegId}
          onSubmitted={() => {
            setEditingLegId(null);
            reload();
          }}
          onCancel={() => setEditingLegId(null)}
          title={
            legsPerMember > 1
              ? `Change leg ${
                  userLegs.find((l) => l.id === editingLegId)?.legIndex ?? ""
                }`
              : undefined
          }
        />
      )}

      <RoundHistory rounds={data.recentRounds} groupId={group.id} />
    </div>
  );
}
