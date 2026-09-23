"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

async function readError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return typeof data?.error === "string" ? data.error : fallback;
}

export function AdminUnverifiedUserActions({
  userId,
  email,
  name,
  groupCount,
  legCount,
}: {
  userId: string;
  email: string;
  name: string;
  groupCount: number;
  legCount: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(email);
  const [busy, setBusy] = useState<"save" | "remove" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function save(nextEmail: string) {
    setBusy("save");
    setError("");
    setNotice("");
    const res = await fetch(`/api/admin/unverified-users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: nextEmail }),
    });
    setBusy(null);
    if (!res.ok) {
      setError(await readError(res, "Couldn't update"));
      return;
    }
    setEditing(false);
    setNotice("Link sent");
    router.refresh();
  }

  async function remove() {
    const impact = [
      groupCount > 0 ? `leave ${groupCount} group${groupCount === 1 ? "" : "s"}` : null,
      legCount > 0 ? `keep ${legCount} leg${legCount === 1 ? "" : "s"} as "Former member"` : null,
    ].filter(Boolean);
    const message = `Remove ${name} (${email})?${
      impact.length ? ` They will ${impact.join(" and ")}.` : ""
    } This can't be undone.`;
    if (!window.confirm(message)) return;

    setBusy("remove");
    setError("");
    setNotice("");
    const res = await fetch(`/api/admin/unverified-users/${userId}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) {
      setError(await readError(res, "Couldn't remove"));
      return;
    }
    router.refresh();
  }

  const buttonClass =
    "rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:border-accent disabled:opacity-50";

  return (
    <div className="space-y-2">
      {editing ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void save(draft);
          }}
        >
          <input
            aria-label="Corrected email"
            className="w-56 rounded-lg border border-border bg-background px-2 py-1 text-xs"
            onChange={(e) => setDraft(e.target.value)}
            type="email"
            value={draft}
            required
          />
          <button className={buttonClass} disabled={busy !== null} type="submit">
            {busy === "save" ? "Saving…" : "Save & send link"}
          </button>
          <button
            className="text-xs text-muted hover:text-foreground"
            onClick={() => {
              setEditing(false);
              setDraft(email);
            }}
            type="button"
          >
            Cancel
          </button>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button className={buttonClass} disabled={busy !== null} onClick={() => setEditing(true)} type="button">
            Fix email
          </button>
          <button className={buttonClass} disabled={busy !== null} onClick={() => void save(email)} type="button">
            {busy === "save" ? "Sending…" : "Resend link"}
          </button>
          <button
            className="rounded-lg border border-danger-strong/40 px-2.5 py-1 text-xs font-medium text-danger-strong hover:bg-danger-strong/10 disabled:opacity-50"
            disabled={busy !== null}
            onClick={() => void remove()}
            type="button"
          >
            {busy === "remove" ? "Removing…" : "Remove"}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-danger-strong">{error}</p>}
      {notice && <p className="text-xs text-accent">{notice}</p>}
    </div>
  );
}
