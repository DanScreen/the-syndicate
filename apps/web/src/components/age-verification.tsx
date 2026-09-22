"use client";

import {
  AGE_CHECK_EXPLAINER,
  MIN_SIGN_UP_AGE,
  UNDER_AGE_MESSAGE,
  ageInYears,
  formatDateOfBirth,
  meetsMinimumAge,
} from "@tiki-acca/shared";
import { useEffect, useState } from "react";

/**
 * Age verification panel on the account page — web parity with the mobile
 * Account screen. Shows the 18+ status held for the signed-in account, and for
 * accounts created before date-of-birth capture collects and verifies it.
 */
export function AgeVerification() {
  // undefined = still loading, null = no DOB on file yet.
  const [dob, setDob] = useState<string | null | undefined>(undefined);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/user/date-of-birth")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("failed"))))
      .then((data: { dateOfBirth: string | null }) => {
        if (active) setDob(data.dateOfBirth);
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!value) {
      setError("Enter your date of birth.");
      return;
    }
    // Checked here and again server-side, with the same shared 18+ rule.
    if (!meetsMinimumAge(value)) {
      setError(UNDER_AGE_MESSAGE);
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/user/date-of-birth", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dateOfBirth: value }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(
        typeof data.error === "string"
          ? data.error
          : "Couldn't save your date of birth."
      );
      return;
    }
    setDob(data.dateOfBirth ?? value);
  }

  if (loadFailed) {
    return (
      <p className="text-sm text-muted">
        Couldn&apos;t load your age verification status. {AGE_CHECK_EXPLAINER}
      </p>
    );
  }

  if (dob === undefined) {
    return (
      <p className="text-sm text-muted">
        Checking your age verification status…
      </p>
    );
  }

  if (dob) {
    const age = ageInYears(dob);
    return (
      <div className="space-y-2">
        <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-bold text-on-accent">
          {MIN_SIGN_UP_AGE}+ verified
        </span>
        <p className="text-sm font-medium text-foreground">
          Date of birth on file: {formatDateOfBirth(dob) ?? dob}
          {age !== null ? ` (age ${age})` : ""}
        </p>
        <p className="text-sm text-muted">
          {AGE_CHECK_EXPLAINER} Your date of birth can&apos;t be changed here —
          contact support if it needs correcting.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleConfirm} className="space-y-3">
      <span className="inline-block rounded-full border border-border px-3 py-1 text-xs font-bold text-muted">
        Not verified
      </span>
      <p className="text-sm text-muted">
        Tiki Acca is {MIN_SIGN_UP_AGE}+ only. Confirm your date of birth to
        verify your age on this account. It is checked on our servers and saved
        once.
      </p>
      <div>
        <label htmlFor="verify-dob" className="text-sm text-muted">
          Date of birth
        </label>
        <input
          id="verify-dob"
          type="date"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError("");
          }}
          autoComplete="bday"
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2"
          required
        />
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-on-accent disabled:opacity-60"
      >
        {busy ? "Saving…" : `Confirm I am ${MIN_SIGN_UP_AGE} or over`}
      </button>
    </form>
  );
}
