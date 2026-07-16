"use client";

import { Logo } from "@/components/logo";
import { MIN_SIGN_UP_AGE } from "@tiki-acca/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignUpPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Latest date allowed in the picker: today minus the minimum sign-up age.
  const maxDateOfBirth = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - MIN_SIGN_UP_AGE);
    return d.toISOString().slice(0, 10);
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, email, password, dateOfBirth }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      const fieldError =
        data.error?.fieldErrors?.firstName?.[0] ??
        data.error?.fieldErrors?.lastName?.[0] ??
        data.error?.fieldErrors?.dateOfBirth?.[0] ??
        data.error?.fieldErrors?.email?.[0] ??
        data.error?.fieldErrors?.password?.[0];
      setError(fieldError ?? data.error?.formErrors?.[0] ?? data.error ?? "Sign up failed");
      return;
    }

    router.push("/sign-in?registered=1");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <Logo className="mb-8 self-start" size="lg" />
      <h1 className="text-2xl font-bold">Create account</h1>
      <p className="mt-2 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-muted">First name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="text-sm text-muted">Last name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2"
              required
            />
          </div>
        </div>
        <div>
          <label className="text-sm text-muted">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="text-sm text-muted">Date of birth</label>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            autoComplete="bday"
            max={maxDateOfBirth}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2"
            required
          />
          <p className="mt-1 text-xs text-muted">You must be {MIN_SIGN_UP_AGE} or over to play.</p>
        </div>
        <div>
          <label className="text-sm text-muted">Password (min 8 chars)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2"
            minLength={8}
            required
          />
        </div>
        {error && <p className="text-sm text-red-400">{String(error)}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent py-2.5 font-medium text-black hover:bg-green-400 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>
    </div>
  );
}
