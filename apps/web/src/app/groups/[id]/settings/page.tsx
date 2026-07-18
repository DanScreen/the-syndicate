"use client";

import { useGroupData } from "@/context/group-data";
import {
  DEFAULT_LEGS_PER_MEMBER,
  DEFAULT_MAX_ACTIVE_BETS,
  LEGS_PER_MEMBER_OPTIONS,
  MAX_ACTIVE_BETS_OPTIONS,
  type LegsPerMember,
  type MaxActiveBets,
} from "@tiki-acca/shared";
import { useEffect, useState } from "react";

export default function GroupSettingsPage() {
  const { data, reload } = useGroupData();
  const [legsPerMember, setLegsPerMember] = useState<LegsPerMember>(
    DEFAULT_LEGS_PER_MEMBER
  );
  const [maxActiveBets, setMaxActiveBets] = useState<MaxActiveBets>(
    DEFAULT_MAX_ACTIVE_BETS
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedNote, setSavedNote] = useState("");

  useEffect(() => {
    if (data?.group.legsPerMember != null) {
      setLegsPerMember(data.group.legsPerMember as LegsPerMember);
    }
  }, [data?.group.legsPerMember]);
  useEffect(() => {
    if (data?.group.maxActiveBets != null) {
      setMaxActiveBets(data.group.maxActiveBets as MaxActiveBets);
    }
  }, [data?.group.maxActiveBets]);

  if (!data) return null;

  const activeRounds = data.activeRounds ?? (data.activeRound ? [data.activeRound] : []);
  const openRounds = activeRounds.filter((round) => round.status === "open");
  const lockedRounds = activeRounds.filter((round) => round.status === "locked");

  if (!data.isOwner) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted">
        Only the group owner can change settings. This group uses{" "}
        <span className="text-foreground">
          {data.group.legsPerMember} leg
          {data.group.legsPerMember === 1 ? "" : "s"} per member
        </span>
        , with up to {data.group.maxActiveBets} active bet
        {data.group.maxActiveBets === 1 ? "" : "s"}.
      </div>
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setSaving(true);
    setError("");
    setSavedNote("");

    const res = await fetch(`/api/groups/${data.group.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ legsPerMember, maxActiveBets }),
    });
    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(
        typeof json.error === "string" ? json.error : "Failed to save settings"
      );
      return;
    }

    setSavedNote(json.note ?? "Saved.");
    await reload();
  }

  const openRoundsMatchQuota = openRounds.every(
    (round) => round.legsPerMember === legsPerMember
  );

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Group Settings</h2>
        <p className="mt-1 text-sm text-muted">
          Configure how your group builds each acca.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="space-y-4 rounded-xl border border-border bg-card p-5"
      >
        <fieldset>
          <legend className="font-medium">Legs per member</legend>
          <p className="mt-1 text-sm text-muted">
            Everyone submits the same number of legs. Changes apply to{" "}
            <strong className="text-foreground">open rounds immediately</strong>
            . Locked or in-progress bets keep their quota until the next round.
          </p>
          {lockedRounds.length > 0 && (
            <p className="mt-2 text-sm text-muted">
              {lockedRounds.length} locked bet
              {lockedRounds.length === 1 ? "" : "s"} will keep their existing
              quota.
            </p>
          )}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {LEGS_PER_MEMBER_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setLegsPerMember(n)}
                className={`rounded-lg border px-3 py-3 text-sm font-medium ${
                  legsPerMember === n
                    ? "border-accent bg-accent-muted/40 text-accent"
                    : "border-border bg-background text-muted hover:text-foreground"
                }`}
              >
                {n} {n === 1 ? "leg" : "legs"}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="border-t border-border pt-4">
          <legend className="font-medium">Maximum active bets</legend>
          <p className="mt-1 text-sm text-muted">
            Choose how many open or locked, unresolved bets your group can run
            at once. With more than one, any member can start a new bet after
            every existing open bet has at least one leg.
          </p>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {MAX_ACTIVE_BETS_OPTIONS.map((n) => {
              const belowCurrent = n < activeRounds.length;
              return (
                <button
                  key={n}
                  type="button"
                  disabled={belowCurrent}
                  title={
                    belowCurrent
                      ? `${activeRounds.length} bets are currently unresolved`
                      : undefined
                  }
                  onClick={() => setMaxActiveBets(n)}
                  className={`rounded-lg border px-2 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
                    maxActiveBets === n
                      ? "border-accent bg-accent-muted/40 text-accent"
                      : "border-border bg-background text-muted hover:text-foreground"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted">
            {activeRounds.length} bet{activeRounds.length === 1 ? "" : "s"} currently
            open or locked.
          </p>
        </fieldset>

        {error && <p className="text-sm text-danger">{error}</p>}
        {savedNote && <p className="text-sm text-accent">{savedNote}</p>}

        <button
          type="submit"
          disabled={
            saving ||
            (legsPerMember === data.group.legsPerMember &&
              openRoundsMatchQuota &&
              maxActiveBets === data.group.maxActiveBets)
          }
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-on-accent hover:bg-accent-bright disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </form>
    </div>
  );
}
