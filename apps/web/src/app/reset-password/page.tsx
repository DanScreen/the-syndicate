"use client";

import { Logo } from "@/components/logo";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error?.fieldErrors?.password?.[0] ?? data.error ?? "Something went wrong");
      return;
    }

    router.push("/sign-in?reset=1");
  }

  if (!token) {
    return (
      <p className="mt-4 text-sm text-danger">
        This reset link is missing its token. Request a new one from the{" "}
        <Link href="/forgot-password" className="text-accent hover:underline">
          forgot password
        </Link>{" "}
        page.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <div>
        <label htmlFor="reset-password" className="text-sm text-muted">New password (min 8 chars)</label>
        <input
          id="reset-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2"
          required
        />
      </div>
      <div>
        <label htmlFor="reset-confirm-password" className="text-sm text-muted">Confirm password</label>
        <input
          id="reset-confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2"
          required
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-accent py-2.5 font-medium text-on-accent hover:bg-accent-bright disabled:opacity-50"
      >
        {loading ? "Resetting…" : "Reset password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <Logo className="mb-8 self-start" size="lg" />
      <h1 className="font-display text-2xl font-bold">Set a new password</h1>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
