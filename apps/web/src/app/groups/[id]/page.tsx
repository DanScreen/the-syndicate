"use client";

import { formatOdds } from "@tiki-acca/shared";

import {
  AccaSummary,
  LegsList,
  RoundProgress,
  SubmitLegForm,
} from "@/components/group-ui";
import { RoundThread } from "@/components/group-chat";
import { RoundHistory } from "@/components/group-history";
import { useGroupData } from "@/context/group-data";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import type { RoundMessageDto } from "@tiki-acca/shared";

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
  const { data, reload, markChatRead } = useGroupData();
  const [editingLegId, setEditingLegId] = useState<string | null>(null);
  const [removingLegId, setRemovingLegId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState("");
  const [roundMessages, setRoundMessages] = useState<RoundMessageDto[]>([]);
  const [chatRefreshKey, setChatRefreshKey] = useState(0);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [creatingRound, setCreatingRound] = useState(false);
  const [createRoundError, setCreateRoundError] = useState("");

  const activeRounds =
    data?.activeRounds?.length
      ? data.activeRounds
      : data?.activeRound
        ? [data.activeRound]
        : [];
  useEffect(() => {
    if (activeRounds.length === 0) return;
    if (!activeRounds.some((round) => round.id === selectedRoundId)) {
      setSelectedRoundId(activeRounds[0]!.id);
    }
  }, [activeRounds, selectedRoundId]);
  useEffect(() => {
    setEditingLegId(null);
    setRemoveError("");
    setRoundMessages([]);
    setChatRefreshKey(0);
  }, [selectedRoundId]);

  if (!data || activeRounds.length === 0) return null;

  const activeRound =
    activeRounds.find((round) => round.id === selectedRoundId) ??
    activeRounds[0]!;
  const userId = session?.user?.id;
  const { group } = data;
  const betslipLink = activeRound.betslipLink ?? data.betslipLink;
  const betslipLinks = activeRound.betslipLinks ?? data.betslipLinks;
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
  // The bet is underway once the first fixture kicks off (betting has closed).
  const accaStarted = Boolean(firstKickoff && Date.now() >= firstKickoff.getTime());
  const editWindowOpen =
    (isOpen || isLocked) && (!firstKickoff || Date.now() < firstKickoff.getTime());
  const lockedBookmakerName =
    activeRound.accaBookmakerRankings?.find(
      (r) => r.bookmakerId === activeRound.bestBookmakerId
    )?.bookmakerName ?? activeRound.legs[0]?.bookmakerName;

  let lockedBanner = "Acca locked. Place your bet at the bookmaker.";
  if (resolvedLegs > 0 && resolvedLegs < activeRound.legs.length) {
    lockedBanner = `Acca in progress: ${resolvedLegs} of ${activeRound.legs.length} legs settled`;
  } else if (resolvedLegs === activeRound.legs.length && activeRound.legs.length > 0) {
    lockedBanner = "All legs settled. Acca will finalize shortly.";
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
  const emptyOpenBet = activeRounds.some(
    (round) => round.status === "open" && round.legs.length === 0
  );
  const activeBetLimit = group.maxActiveBets ?? 1;
  const canCreateRound =
    activeBetLimit > 1 &&
    activeRounds.length < activeBetLimit &&
    !emptyOpenBet;

  const nextSlot = userLegs.length + 1;
  const announcementByLegId = new Map<string, RoundMessageDto>();
  for (const message of roundMessages) {
    if (
      message.legId &&
      (message.eventType === "leg_submitted" || message.eventType === "leg_changed")
    ) {
      announcementByLegId.set(message.legId, message);
    }
  }

  async function removeLeg(legId: string, selectionLabel: string) {
    if (!window.confirm(`Remove ${selectionLabel} from this acca?`)) return;

    setRemovingLegId(legId);
    setRemoveError("");
    try {
      const response = await fetch(`/api/legs/${legId}`, { method: "DELETE" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setRemoveError(
          typeof body.error === "string" ? body.error : "Failed to remove leg"
        );
        return;
      }
      await reload();
      setChatRefreshKey((key) => key + 1);
    } catch {
      setRemoveError("Failed to remove leg");
    } finally {
      setRemovingLegId(null);
    }
  }

  async function createRound() {
    setCreatingRound(true);
    setCreateRoundError("");
    try {
      const response = await fetch(`/api/groups/${group.id}/rounds`, {
        method: "POST",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setCreateRoundError(
          typeof body.error === "string" ? body.error : "Failed to create bet"
        );
        return;
      }
      await reload();
      setSelectedRoundId(body.round.id);
    } catch {
      setCreateRoundError("Failed to create bet");
    } finally {
      setCreatingRound(false);
    }
  }

  return (
    <div className="space-y-6">
      {activeBetLimit > 1 && (
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Active Bets</h2>
              <p className="mt-1 text-xs text-muted">
                {activeRounds.length} of {activeBetLimit} available
              </p>
            </div>
            <button
              type="button"
              disabled={!canCreateRound || creatingRound}
              onClick={() => void createRound()}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-on-accent hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creatingRound ? "Creating…" : "New Bet"}
            </button>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {activeRounds.map((round) => {
              const selected = round.id === activeRound.id;
              return (
                <button
                  key={round.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelectedRoundId(round.id)}
                  className={`min-w-32 rounded-lg border px-3 py-2 text-left transition-colors ${
                    selected
                      ? "border-accent bg-accent-muted/40"
                      : "border-border bg-background hover:border-accent/40"
                  }`}
                >
                  <span className="block text-sm font-medium">
                    Bet #{round.betNumber ?? "—"}
                  </span>
                  <span
                    className={`mt-0.5 block text-xs ${
                      round.status === "open" ? "text-accent" : "text-muted"
                    }`}
                  >
                    {round.status === "open" ? "Open" : "Locked"} ·{" "}
                    {round.legs.length} leg{round.legs.length === 1 ? "" : "s"}
                  </span>
                </button>
              );
            })}
          </div>
          {!canCreateRound && activeRounds.length < activeBetLimit && emptyOpenBet && (
            <p className="mt-2 text-xs text-muted">
              Add a leg to the empty open bet before creating another.
            </p>
          )}
          {createRoundError && (
            <p className="mt-2 text-sm text-danger">{createRoundError}</p>
          )}
        </section>
      )}

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
            announcementByLegId={announcementByLegId}
            onAnnouncementChanged={(updated) => {
              setRoundMessages((current) =>
                current.map((message) =>
                  message.id === updated.id ? updated : message
                )
              );
              setChatRefreshKey((key) => key + 1);
            }}
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
          // Show the ranked best-odds-across-bookmakers list while open
          // (provisional) and once locked (the odds captured at lock) — locked
          // is when members go place the bet, so the comparison is essential.
          // Collapse it once the bet is underway (past first kickoff): still
          // available, just out of the way since you can no longer place it.
          showBookmakerCompare={isOpen || isLocked}
          compareDefaultOpen={!accaStarted}
          inProgress={isLocked}
          preview={isOpen}
        />
      )}

      {canSubmitMore && !editingLegId && (
        <SubmitLegForm
          roundId={activeRound.id}
          onSubmitted={reload}
          existingLegs={activeRound.legs}
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
            You can change {isOpen ? "or remove " : ""}them until the first kickoff
            {firstKickoff ? ` (${formatCutoff(firstKickoff)})` : ""}.
            {isLocked && " Changing a pick reprices the whole acca at current odds."}
          </p>
          {removeError && <p className="text-sm text-danger">{removeError}</p>}
          <ul className="mt-2 space-y-2">
            {userLegs.map((leg) => (
              <li
                key={leg.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span>
                  {legsPerMember > 1 ? `Leg ${leg.legIndex ?? ""}: ` : ""}
                  {leg.selectionLabel} ({formatOdds(leg.odds)})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingLegId(leg.id)}
                    className="rounded-lg border border-accent px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent-muted/30"
                  >
                    Change
                  </button>
                  {isOpen && (
                    <button
                      type="button"
                      disabled={removingLegId === leg.id}
                      onClick={() => void removeLeg(leg.id, leg.selectionLabel)}
                      className="rounded-lg border border-danger/60 px-3 py-1.5 text-sm font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
                    >
                      {removingLegId === leg.id ? "Removing…" : "Remove"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {editingLegId && editWindowOpen && (
        <SubmitLegForm
          roundId={activeRound.id}
          editLegId={editingLegId}
          existingLegs={activeRound.legs}
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

      <RoundThread
        key={activeRound.id}
        roundId={activeRound.id}
        currentUserId={userId}
        isOwner={data.isOwner}
        onRead={markChatRead}
        onMessagesChange={setRoundMessages}
        refreshKey={chatRefreshKey}
      />

      <RoundHistory rounds={data.recentRounds} groupId={group.id} />
    </div>
  );
}
