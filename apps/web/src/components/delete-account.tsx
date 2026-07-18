"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

/** In-app account deletion (App Review 5.1.1(v)) — web parity with mobile. */
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) {
      setError("Enter your password to confirm.");
      return;
    }
    if (
      !window.confirm(
        "Delete your account permanently? Your personal details are removed and you'll be signed out everywhere. This can't be undone."
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/user", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        typeof data.error === "string" ? data.error : "Couldn't delete your account."
      );
      setBusy(false);
      return;
    }
    await signOut({ callbackUrl: "/" });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-danger-strong/50 px-4 py-2 text-sm font-medium text-danger hover:bg-danger-strong/10"
      >
        Delete account
      </button>
    );
  }

  return (
    <form onSubmit={handleDelete} className="space-y-3">
      <div>
        <label htmlFor="delete-password" className="text-sm text-muted">
          Confirm your password
        </label>
        <input
          id="delete-password"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2"
          required
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-danger-strong px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Deleting…" : "Permanently delete my account"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setPassword("");
            setError("");
          }}
          className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-card"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
