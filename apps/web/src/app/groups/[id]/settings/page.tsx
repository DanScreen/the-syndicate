"use client";

import { useGroupData } from "@/context/group-data";
import {
  DEFAULT_LEGS_PER_MEMBER,
  LEGS_PER_MEMBER_OPTIONS,
  type LegsPerMember,
} from "@tiki-acca/shared";
import { useEffect, useState } from "react";

export default function GroupSettingsPage() {
  const { data, reload } = useGroupData();
  const [legsPerMember, setLegsPerMember] = useState<LegsPerMember>(
    DEFAULT_LEGS_PER_MEMBER
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedNote, setSavedNote] = useState("");

  useEffect(() => {
    if (data?.group.legsPerMember != null) {
      setLegsPerMember(data.group.legsPerMember as LegsPerMember);
    }
  }, [data?.group.legsPerMember]);

  if (!data) return null;

  const openRound =
    data.activeRound?.status === "open" ? data.activeRound : null;
  const lockedRound =
    data.activeRound?.status === "locked" ? data.activeRound : null;

  if (!data.isOwner) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted">
        Only the group owner can change settings. This group uses{" "}
        <span className="text-foreground">
          {data.group.legsPerMember} leg
          {data.group.legsPerMember === 1 ? "" : "s"} per member
        </span>
        {openRound
          ? ` (current open round: ${openRound.legsPerMember})`
          : lockedRound
            ? ` (locked round stays at ${lockedRound.legsPerMember})`
            : ""}
        .
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
      body: JSON.stringify({ legsPerMember }),
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

  const currentEffective =
    openRound?.legsPerMember ?? data.group.legsPerMember;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Group settings</h2>
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
          {lockedRound && (
            <p className="mt-2 text-sm text-muted">
              Current bet is locked at {lockedRound.legsPerMember} leg
              {lockedRound.legsPerMember === 1 ? "" : "s"} each. A new setting
              starts with the next open round.
            </p>
          )}
          {openRound && openRound.legsPerMember !== data.group.legsPerMember && (
            <p className="mt-2 text-sm text-amber-200/90">
              Open round is on {openRound.legsPerMember}; group default is{" "}
              {data.group.legsPerMember}. Saving will sync the open round when
              possible.
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

        {error && <p className="text-sm text-red-400">{error}</p>}
        {savedNote && <p className="text-sm text-accent">{savedNote}</p>}

        <button
          type="submit"
          disabled={
            saving ||
            (legsPerMember === data.group.legsPerMember &&
              legsPerMember === currentEffective)
          }
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-black hover:bg-green-400 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save settings"}
        </button>
      </form>
    </div>
  );
}
