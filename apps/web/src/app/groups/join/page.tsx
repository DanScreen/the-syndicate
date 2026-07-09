"use client";

import { AppHeader } from "@/components/header";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function JoinGroupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    if (code) setInviteCode(code.toUpperCase());
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/groups/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: inviteCode.toUpperCase() }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to join group");
      return;
    }

    router.push(`/groups/${data.groupId}`);
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

export default function JoinGroupPage() {
  return (
    <div className="min-h-screen">
      <AppHeader userName="" />
      <main className="mx-auto max-w-md px-4 py-8">
        <h1 className="text-2xl font-bold">Join a group</h1>
        <p className="mt-2 text-sm text-muted">
          Enter the invite code shared by your group owner, or open their invite link
          directly.
        </p>
        <Suspense fallback={<p className="mt-6 text-sm text-muted">Loading...</p>}>
          <JoinGroupForm />
        </Suspense>
      </main>
    </div>
  );
}
