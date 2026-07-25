"use client";

import { Logo } from "@/components/logo";
import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error?.fieldErrors?.email?.[0] ?? "Something went wrong");
      return;
    }

    setSent(true);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <Logo className="mb-8 self-start" size="lg" />
      <h1 className="font-display text-2xl font-bold">Reset your password</h1>

      {sent ? (
        <p className="mt-4 rounded-lg border border-accent/30 bg-accent-muted/20 px-3 py-2 text-sm text-accent">
          If that email is registered, we&apos;ve sent a password reset link. Check your inbox.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="forgot-email" className="text-sm text-muted">Email</label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2"
                autoComplete="email"
                required
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-accent py-2.5 font-medium text-on-accent hover:bg-accent-bright disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        </>
      )}

      <p className="mt-6 text-sm text-muted">
        <Link href="/sign-in" className="text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
