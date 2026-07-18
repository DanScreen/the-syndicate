"use client";

import { Logo } from "@/components/logo";
import { safeCallbackUrl, withCallbackUrl } from "@/lib/callback-url";
import { MIN_SIGN_UP_AGE } from "@tiki-acca/shared";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));
  const joiningGroup = callbackUrl.startsWith("/groups/join");

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

    const signInHref = withCallbackUrl("/sign-in", callbackUrl);
    const separator = signInHref.includes("?") ? "&" : "?";
    router.push(`${signInHref}${separator}registered=1`);
  }

  return (
    <>
      <h1 className="font-display text-2xl font-bold">Create Account</h1>
      <p className="mt-2 text-sm text-muted">
        {joiningGroup
          ? "Create an account to join the group you were invited to. Already have one? "
          : "Already have an account? "}
        <Link
          href={withCallbackUrl("/sign-in", callbackUrl)}
          className="text-accent hover:underline"
        >
          Sign in
        </Link>
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="signup-first-name" className="text-sm text-muted">First name</label>
            <input
              id="signup-first-name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2"
              required
            />
          </div>
          <div>
            <label htmlFor="signup-last-name" className="text-sm text-muted">Last name</label>
            <input
              id="signup-last-name"
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
          <label htmlFor="signup-email" className="text-sm text-muted">Email</label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2"
            required
          />
        </div>
        <div>
          <label htmlFor="signup-dob" className="text-sm text-muted">Date of birth</label>
          <input
            id="signup-dob"
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
          <label htmlFor="signup-password" className="text-sm text-muted">Password (min 8 chars)</label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2"
            minLength={8}
            required
          />
        </div>
        {error && <p className="text-sm text-danger">{String(error)}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent py-2.5 font-medium text-on-accent hover:bg-accent-bright disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>
    </>
  );
}

export default function SignUpPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <Logo className="mb-8 self-start" size="lg" />
      <Suspense>
        <SignUpForm />
      </Suspense>
    </div>
  );
}
