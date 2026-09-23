"use client";

import { AccaSummary } from "@/components/group/acca-summary";
import { LegsList } from "@/components/group/legs-list";
import { RoundProgress } from "@/components/group/round-progress";
import { SubmitLegForm } from "@/components/group/submit-leg-form";
import { RoundHistory } from "@/components/group/history";
import { useGroupData } from "@/context/group-data";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import {
  SOLO_MAX_LEGS,
  announcementsByLegId,
  changeLegTitle,
  deriveRoundView,
  formatKickoff,
  legAddedCelebration,
  type RoundMessageDto,
} from "@tiki-acca/shared";

export default function GroupRoundPage() {
  const { data: session } = useSession();
  const { data, reload } = useGroupData();
  const [editingLegId, setEditingLegId] = useState<string | null>(null);
  const [removingLegId, setRemovingLegId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState("");
  const [lockingRound, setLockingRound] = useState(false);
  const [lockError, setLockError] = useState("");
  const [legAnnouncements, setLegAnnouncements] = useState<RoundMessageDto[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [creatingRound, setCreatingRound] = useState(false);
  const [createRoundError, setCreateRoundError] = useState("");
  const [legCelebration, setLegCelebration] = useState<"Leg added" | "All legs added" | null>(
    null
  );
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousRoundRef = useRef<string | null>(null);
  const previousUserLegCountRef = useRef(0);

  const view = data
    ? deriveRoundView({ data, selectedRoundId, userId: session?.user?.id })
    : null;
  const activeRounds = view?.activeRounds;
  useEffect(() => {
    if (!activeRounds || activeRounds.length === 0) return;
    if (!activeRounds.some((round) => round.id === selectedRoundId)) {
      setSelectedRoundId(activeRounds[0]!.id);
    }
  }, [activeRounds, selectedRoundId]);
  useEffect(() => {
    setEditingLegId(null);
    setRemoveError("");
  }, [selectedRoundId]);
  useEffect(() => {
    setLegAnnouncements(data?.legAnnouncements ?? []);
  }, [data?.legAnnouncements]);

  const userLegCount = view?.userLegs.length ?? 0;
  const legsPerMember = view?.legsPerMember ?? 1;
  const selectedRoundKey = view?.round?.id ?? null;
  const selectedRoundStatus = view?.round?.status ?? null;

  useEffect(() => {
    if (!selectedRoundKey) return;
    if (previousRoundRef.current !== selectedRoundKey) {
      previousRoundRef.current = selectedRoundKey;
      previousUserLegCountRef.current = userLegCount;
      setLegCelebration(null);
      return;
    }

    const previousCount = previousUserLegCountRef.current;
    if (
      selectedRoundStatus === "open" &&
      userLegCount > previousCount &&
      !editingLegId
    ) {
      setLegCelebration(legAddedCelebration(userLegCount, legsPerMember));
      if (celebrationTimerRef.current) {
        clearTimeout(celebrationTimerRef.current);
      }
      celebrationTimerRef.current = setTimeout(() => {
        setLegCelebration(null);
        celebrationTimerRef.current = null;
      }, 1800);
    }

    previousUserLegCountRef.current = userLegCount;
  }, [selectedRoundKey, selectedRoundStatus, editingLegId, legsPerMember, userLegCount]);

  useEffect(() => {
    return () => {
      if (celebrationTimerRef.current) {
        clearTimeout(celebrationTimerRef.current);
      }
    };
  }, []);

  if (!data || !view?.round) return null;

  const activeRound = view.round;
  const { group } = data;
  const { acca, isLocked, isOpen, isSolo, firstKickoff, editWindowOpen } = view;
  const announcementByLegId = announcementsByLegId(legAnnouncements);

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
    } catch {
      setRemoveError("Failed to remove leg");
    } finally {
      setRemovingLegId(null);
    }
  }

  async function lockSoloRound() {
    if (
      !window.confirm(
        `Lock this acca with ${activeRound.legs.length} leg${
          activeRound.legs.length === 1 ? "" : "s"
        }? You won't be able to add more.`
      )
    ) {
      return;
    }

    setLockingRound(true);
    setLockError("");
    try {
      const response = await fetch(`/api/rounds/${activeRound.id}/lock`, {
        method: "POST",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setLockError(
          typeof body.error === "string" ? body.error : "Failed to lock acca"
        );
        return;
      }
      await reload();
    } catch {
      setLockError("Failed to lock acca");
    } finally {
      setLockingRound(false);
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
      {view.activeBetLimit > 1 && (
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Active Bets</h2>
              <p className="mt-1 text-xs text-muted">
                {view.activeRounds.length} of {view.activeBetLimit} available
              </p>
            </div>
            <button
              type="button"
              disabled={!view.canCreateRound || creatingRound}
              onClick={() => void createRound()}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-on-accent hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creatingRound ? "Creating…" : "New Bet"}
            </button>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {view.activeRounds.map((round) => {
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
          {view.showEmptyBetHint && (
            <p className="mt-2 text-xs text-muted">
              Add a leg to the empty open bet before creating another.
            </p>
          )}
          {createRoundError && (
            <p className="mt-2 text-sm text-danger">{createRoundError}</p>
          )}
        </section>
      )}

      {isOpen && !isSolo && (
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
          {view.lockedBanner}
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold">Picks</h2>
        {isSolo ? (
          <p className="mt-1 text-sm text-muted">
            Build your acca — up to {SOLO_MAX_LEGS} legs, then lock it when
            you&apos;re ready.
          </p>
        ) : (
          legsPerMember > 1 && (
            <p className="mt-1 text-sm text-muted">
              {legsPerMember} legs each this round
            </p>
          )
        )}
        {isSolo && isOpen && activeRound.legs.length > 0 && !editingLegId && (
          <div className="mt-3">
            <button
              type="button"
              onClick={lockSoloRound}
              disabled={lockingRound}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-bright disabled:opacity-60"
            >
              {lockingRound
                ? "Locking…"
                : `Lock acca (${activeRound.legs.length} leg${
                    activeRound.legs.length === 1 ? "" : "s"
                  })`}
            </button>
            <p className="mt-1 text-xs text-muted">
              Locking freezes your combined odds and shows the best bookmaker
              for the whole acca.
            </p>
            {lockError && <p className="mt-1 text-sm text-danger">{lockError}</p>}
          </div>
        )}
        {view.userLegs.length > 0 && editWindowOpen && !editingLegId && (
          <p className="mt-1 text-sm text-muted">
            You can change {isOpen ? "or remove " : ""}your pick
            {view.userLegs.length === 1 ? "" : "s"} until the first kickoff
            {firstKickoff ? ` (${formatKickoff(firstKickoff)})` : ""}.
            {isLocked && " Changing a pick reprices the whole acca at current odds."}
          </p>
        )}
        {removeError && <p className="mt-1 text-sm text-danger">{removeError}</p>}
        <div className="mt-3">
          <LegsList
            legs={activeRound.legs}
            legLinks={view.legLinks}
            showOpenLinks={view.showOpenLinks}
            inProgress={isLocked}
            showLegIndex={view.showLegIndex}
            announcementByLegId={announcementByLegId}
            onAnnouncementChanged={(updated) => {
              setLegAnnouncements((current) =>
                current.map((message) =>
                  message.id === updated.id ? updated : message
                )
              );
            }}
            currentUserId={session?.user?.id}
            editWindowOpen={editWindowOpen && !editingLegId}
            canRemove={isOpen}
            removingLegId={removingLegId}
            onChangeLeg={(legId) => setEditingLegId(legId)}
            onRemoveLeg={(leg) => void removeLeg(leg.id, leg.selectionLabel)}
          />
        </div>
      </section>

      {acca.show && acca.combinedOdds != null && (
        <AccaSummary
          combinedOdds={acca.combinedOdds}
          bookmakerId={acca.bestBookmakerId}
          bookmakerName={acca.bookmakerName}
          singleBookmaker={Boolean(acca.bestBookmakerId)}
          bookmakerRankings={acca.rankings}
          betslipLink={acca.betslipLink}
          betslipLinkQuality={acca.betslipLinkQuality}
          betslipHasAllLegLinks={acca.betslipHasAllLegLinks}
          legCount={activeRound.legs.length}
          // Show the ranked best-odds-across-bookmakers list while open
          // (using current odds) and once locked (the odds captured at lock) — locked
          // is when members go place the bet, so the comparison is essential.
          // Collapse it once the bet is underway (past first kickoff): still
          // available, just out of the way since you can no longer place it.
          showBookmakerCompare={isOpen || isLocked}
          compareDefaultOpen={acca.compareDefaultOpen}
          inProgress={isLocked}
          preview={isOpen}
        />
      )}

      {view.canSubmitMore && !editingLegId && (
        <div className="space-y-2">
          {legCelebration && (
            <div className="rounded-lg border border-accent/40 bg-accent-muted/40 px-4 py-2 text-center text-sm font-semibold text-accent animate-pulse">
              {legCelebration}
            </div>
          )}
          <SubmitLegForm
            key={`submit-leg-${view.userLegs.length}`}
            roundId={activeRound.id}
            onSubmitted={reload}
            existingLegs={activeRound.legs}
            legSlot={view.nextSlot}
            legsPerMember={legsPerMember}
            title={view.submitTitle}
          />
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
          title={changeLegTitle(view, editingLegId)}
        />
      )}

      <RoundHistory rounds={data.recentRounds} groupId={group.id} />
    </div>
  );
}
