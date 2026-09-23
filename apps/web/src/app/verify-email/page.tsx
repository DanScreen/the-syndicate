"use client";

import { Logo } from "@/components/logo";
import { safeCallbackUrl, withCallbackUrl } from "@/lib/callback-url";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

const buttonPrimary =
  "w-full rounded-lg bg-accent py-2.5 font-medium text-on-accent hover:bg-accent-bright disabled:opacity-50";
const buttonSecondary =
  "w-full rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-card disabled:opacity-50";
const inputClass = "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2";

function errorMessage(data: unknown, fallback: string): string {
  const error = (data as { error?: unknown })?.error;
  if (typeof error === "string") return error;
  const flat = error as
    | { formErrors?: string[]; fieldErrors?: Record<string, string[] | undefined> }
    | undefined;
  return (
    flat?.fieldErrors?.email?.[0] ??
    flat?.fieldErrors?.password?.[0] ??
    flat?.formErrors?.[0] ??
    fallback
  );
}

/**
 * `update()` flips status to "loading" while it refetches but keeps the
 * current session, so treat that as still signed in rather than swapping UI.
 */
function isSignedIn(status: ReturnType<typeof useSession>["status"], session: unknown): boolean {
  return status === "authenticated" || (status === "loading" && session != null);
}

/** Emailed link landing: consumes `?token=`. Works signed-out too. */
function TokenVerifier({ token, callbackUrl }: { token: string; callbackUrl: string }) {
  const { data: session, status, update } = useSession();
  const signedIn = isSignedIn(status, session);
  const [state, setState] = useState<"verifying" | "done" | "failed">("verifying");
  const [error, setError] = useState("");
  const [refreshed, setRefreshed] = useState(false);
  const attempted = useRef(false);
  const refreshStarted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    void (async () => {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(errorMessage(data, "Something went wrong"));
        setState("failed");
        return;
      }
      setState("done");
    })();
  }, [token]);

  // Re-issue the session cookie so middleware stops sending them back here.
  // Once only: update() cycles status through "loading" and returns a new
  // function each render, so re-running on those deps loops forever.
  useEffect(() => {
    if (state !== "done" || status !== "authenticated" || refreshStarted.current) return;
    refreshStarted.current = true;
    void update().finally(() => setRefreshed(true));
  }, [state, status, update]);

  if (state === "verifying") {
    return <p className="mt-4 text-sm text-muted">Confirming your email…</p>;
  }

  if (state === "failed") {
    return (
      <div className="mt-4 space-y-4">
        <p className="text-sm text-danger">{error}</p>
        {signedIn ? (
          <PendingVerification callbackUrl={callbackUrl} />
        ) : (
          <p className="text-sm text-muted">
            <Link href={withCallbackUrl("/sign-in", callbackUrl)} className="text-accent hover:underline">
              Sign in
            </Link>{" "}
            to get a fresh link.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-6">
      <p className="rounded-lg border border-accent/30 bg-accent-muted/20 px-3 py-2 text-sm text-accent">
        Email confirmed — you&apos;re all set.
      </p>
      {status !== "unauthenticated" ? (
        <button
          type="button"
          className={buttonPrimary}
          disabled={!refreshed}
          onClick={() => window.location.assign(callbackUrl)}
        >
          Continue
        </button>
      ) : (
        <Link
          href={withCallbackUrl("/sign-in", callbackUrl)}
          className={`${buttonPrimary} inline-flex justify-center`}
        >
          Sign in
        </Link>
      )}
    </div>
  );
}

function ChangeEmailForm({ onChanged }: { onChanged: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/verify-email/change-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(errorMessage(data, "Couldn't update your email"));
      return;
    }
    onChanged(data.email);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border p-4">
      <div>
        <label htmlFor="change-email" className="text-sm text-muted">Correct email</label>
        <input
          id="change-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className={inputClass}
          required
        />
      </div>
      <div>
        <label htmlFor="change-email-password" className="text-sm text-muted">Password</label>
        <input
          id="change-email-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className={inputClass}
          required
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={loading} className={buttonPrimary}>
        {loading ? "Updating…" : "Update and resend"}
      </button>
    </form>
  );
}

/** Signed in but unverified: the gate every protected route redirects to. */
function PendingVerification({ callbackUrl }: { callbackUrl: string }) {
  const { data: session, update } = useSession();
  const [email, setEmail] = useState(session?.user?.email ?? "");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"resend" | "check" | null>(null);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    if (session?.user?.email) setEmail(session.user.email);
  }, [session?.user?.email]);

  // Accounts from before verification existed have never been sent a link.
  const ensured = useRef(false);
  useEffect(() => {
    if (ensured.current) return;
    ensured.current = true;
    void fetch("/api/auth/verify-email/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onlyIfNonePending: true }),
    });
  }, []);

  async function resend() {
    setBusy("resend");
    setError("");
    setNotice("");
    const res = await fetch("/api/auth/verify-email/resend", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(errorMessage(data, "Couldn't send the email"));
      return;
    }
    if (data.alreadyVerified) {
      window.location.assign(callbackUrl);
      return;
    }
    setNotice("Sent — check your inbox (and spam folder).");
  }

  async function checkAgain() {
    setBusy("check");
    setError("");
    setNotice("");
    const next = await update();
    setBusy(null);
    if (next?.user?.isEmailVerified) {
      window.location.assign(callbackUrl);
      return;
    }
    setError("Not confirmed yet — tap the link in the email we sent you.");
  }

  return (
    <div className="mt-4 space-y-6">
      <p className="text-sm text-muted">
        We&apos;ve sent a confirmation link to{" "}
        <span className="font-medium text-foreground">{email || "your email"}</span>. Tap it to
        start using Tiki Acca. The link expires after 24 hours.
      </p>

      {notice && (
        <p className="rounded-lg border border-accent/30 bg-accent-muted/20 px-3 py-2 text-sm text-accent">
          {notice}
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="space-y-3">
        <button type="button" onClick={checkAgain} disabled={busy !== null} className={buttonPrimary}>
          {busy === "check" ? "Checking…" : "I've confirmed it"}
        </button>
        <button type="button" onClick={resend} disabled={busy !== null} className={buttonSecondary}>
          {busy === "resend" ? "Sending…" : "Resend email"}
        </button>
      </div>

      <div className="space-y-3 text-sm">
        {changing ? (
          <ChangeEmailForm
            onChanged={(next) => {
              setEmail(next);
              setChanging(false);
              setNotice(`Updated — we've sent a new link to ${next}.`);
              void update();
            }}
          />
        ) : (
          <button type="button" onClick={() => setChanging(true)} className="text-accent hover:underline">
            Wrong email address?
          </button>
        )}
        <p className="text-muted">
          Not you?{" "}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: withCallbackUrl("/sign-in", callbackUrl) })}
            className="text-accent hover:underline"
          >
            Sign out
          </button>
        </p>
      </div>
    </div>
  );
}

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));
  const { data: session, status } = useSession();
  const signedIn = isSignedIn(status, session);
  const verified = session?.user?.isEmailVerified !== false;

  // Covers a link clicked in another tab/device: SessionProvider refetches on
  // focus, and the node-side jwt callback reads verification from the DB.
  useEffect(() => {
    if (!token && status === "authenticated" && verified) {
      router.replace(callbackUrl);
    }
  }, [token, status, verified, callbackUrl, router]);

  if (token) return <TokenVerifier token={token} callbackUrl={callbackUrl} />;

  if ((status === "loading" && !signedIn) || (signedIn && verified)) {
    return <p className="mt-4 text-sm text-muted">Loading…</p>;
  }

  if (status === "unauthenticated") {
    return (
      <p className="mt-4 text-sm text-muted">
        <Link href={withCallbackUrl("/sign-in", callbackUrl)} className="text-accent hover:underline">
          Sign in
        </Link>{" "}
        to confirm your email address.
      </p>
    );
  }

  return <PendingVerification callbackUrl={callbackUrl} />;
}

export default function VerifyEmailPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <Logo className="mb-8 self-start" size="lg" />
      <h1 className="font-display text-2xl font-bold">Confirm your email</h1>
      <Suspense>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
