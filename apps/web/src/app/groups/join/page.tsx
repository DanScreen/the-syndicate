"use client";

import { AppHeader } from "@/components/header";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { withCallbackUrl } from "@/lib/callback-url";
import { greetingFirstName } from "@/lib/user-display";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

function joinReturnPath(code: string) {
  return code ? `/groups/join?code=${encodeURIComponent(code)}` : "/groups/join";
}

function SignedOutJoinPrompt({ inviteCode }: { inviteCode: string }) {
  const returnTo = joinReturnPath(inviteCode);

  return (
    <div className="mt-8 space-y-4">
      {inviteCode ? (
        <p className="rounded-lg border border-border bg-card px-3 py-2 font-mono text-sm tracking-widest text-foreground">
          {inviteCode}
        </p>
      ) : null}
      <p className="text-sm text-muted">
        You need an account to join a group. Sign in if you already have one, or
        create an account — we&apos;ll bring you straight back here.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href={withCallbackUrl("/sign-in", returnTo)}
          className="inline-flex flex-1 items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-black hover:bg-accent-bright"
        >
          Sign in
        </Link>
        <Link
          href={withCallbackUrl("/sign-up", returnTo)}
          className="inline-flex flex-1 items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-card"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}

function JoinGroupForm({ inviteCode: initialCode }: { inviteCode: string }) {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState(initialCode);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const autoJoinAttempted = useRef(false);

  useEffect(() => {
    setInviteCode(initialCode);
  }, [initialCode]);

  async function join(code: string) {
    setLoading(true);
    setError("");

    const res = await fetch("/api/groups/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: code.toUpperCase() }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (res.status === 401) {
      setError("Please sign in or sign up to join this group.");
      return;
    }

    if (res.status === 409 && data.groupId) {
      router.push(`/groups/${data.groupId}`);
      return;
    }

    if (res.status === 409) {
      setError("You're already a member of this group.");
      return;
    }

    if (!res.ok) {
      setError(
        typeof data.error === "string" ? data.error : "Failed to join group"
      );
      return;
    }

    router.push(`/groups/${data.groupId}`);
  }

  useEffect(() => {
    if (!initialCode || autoJoinAttempted.current) return;
    autoJoinAttempted.current = true;
    void join(initialCode);
    // Only auto-join once when landing with ?code= while signed in.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-shot
  }, [initialCode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await join(inviteCode);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <label className="text-sm text-muted">Invite code</label>
        <input
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 font-mono tracking-widest"
          placeholder="ABCD1234"
          required
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-accent py-2.5 font-medium text-black hover:bg-green-400 disabled:opacity-50"
      >
        {loading ? "Joining..." : "Join group"}
      </button>
    </form>
  );
}

function JoinGroupContent() {
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const inviteCode = (searchParams.get("code") ?? "").trim().toUpperCase();

  return (
    <>
      {status === "authenticated" && session?.user ? (
        <AppHeader userName={greetingFirstName(session.user)} />
      ) : (
        <MarketingHeader />
      )}
      <main className="mx-auto max-w-md px-4 py-8">
        <h1 className="text-2xl font-bold">Join a group</h1>
        <p className="mt-2 text-sm text-muted">
          {status === "unauthenticated"
            ? "You've been invited to a Tiki Acca group."
            : "Enter the invite code shared by your group owner, or open their invite link directly."}
        </p>
        {status === "loading" ? (
          <p className="mt-6 text-sm text-muted">Loading...</p>
        ) : status === "unauthenticated" ? (
          <SignedOutJoinPrompt inviteCode={inviteCode} />
        ) : (
          <JoinGroupForm inviteCode={inviteCode} />
        )}
      </main>
    </>
  );
}

export default function JoinGroupPage() {
  return (
    <div className="min-h-screen">
      <Suspense
        fallback={
          <>
            <MarketingHeader />
            <main className="mx-auto max-w-md px-4 py-8">
              <h1 className="text-2xl font-bold">Join a group</h1>
              <p className="mt-6 text-sm text-muted">Loading...</p>
            </main>
          </>
        }
      >
        <JoinGroupContent />
      </Suspense>
    </div>
  );
}
