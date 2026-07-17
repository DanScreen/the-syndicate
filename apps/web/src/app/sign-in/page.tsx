"use client";

import { Logo } from "@/components/logo";
import { safeCallbackUrl, withCallbackUrl } from "@/lib/callback-url";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function SignInForm() {
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const joiningGroup = callbackUrl.startsWith("/groups/join");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email: email.trim(),
      password,
      callbackUrl,
      redirect: false,
    });

    setLoading(false);

    if (!result?.ok || result.error) {
      setError("Invalid email or password");
      return;
    }

    window.location.assign(result.url ?? callbackUrl);
  }

  return (
    <>
      <h1 className="text-2xl font-bold">Sign in</h1>
      <p className="mt-2 text-sm text-muted">
        {joiningGroup
          ? "Sign in to join the group you were invited to."
          : "No account?"}{" "}
        <Link
          href={withCallbackUrl("/sign-up", callbackUrl)}
          className="text-accent hover:underline"
        >
          Sign up
        </Link>
        {joiningGroup ? " if you need an account." : null}
      </p>

      {searchParams.get("registered") === "1" && (
        <p className="mt-4 rounded-lg border border-accent/30 bg-accent-muted/20 px-3 py-2 text-sm text-accent">
          Account created — sign in below to continue.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="text-sm text-muted">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2"
            autoComplete="email"
            required
          />
        </div>
        <div>
          <label className="text-sm text-muted">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2"
            autoComplete="current-password"
            required
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent py-2.5 font-medium text-black hover:bg-accent-bright disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </>
  );
}

export default function SignInPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <Logo className="mb-8 self-start" size="lg" />
      <Suspense>
        <SignInForm />
      </Suspense>
    </div>
  );
}
