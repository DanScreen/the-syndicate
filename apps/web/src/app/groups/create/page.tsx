"use client";

import { AppHeader } from "@/components/header";
import { LEGS_PER_MEMBER_OPTIONS, DEFAULT_LEGS_PER_MEMBER, type LegsPerMember } from "@tiki-acca/shared";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreateGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [legsPerMember, setLegsPerMember] = useState<LegsPerMember>(DEFAULT_LEGS_PER_MEMBER);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, legsPerMember }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(
        typeof data.error === "string" ? data.error : "Failed to create group"
      );
      return;
    }

    router.push(`/groups/${data.group.id}`);
  }

  return (
    <div className="min-h-screen">
      <AppHeader userName="" />
      <main className="mx-auto max-w-md px-4 py-8">
        <h1 className="text-2xl font-bold">Create a group</h1>
        <p className="mt-2 text-sm text-muted">
          Anyone with the invite link can join — no member cap.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm text-muted">Group name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2"
              placeholder="Saturday Lads Acca"
              required
            />
          </div>
          <fieldset>
            <legend className="text-sm text-muted">Legs per member</legend>
            <p className="mt-1 text-xs text-muted">
              Everyone submits the same number of legs each round. You can change
              this later in group settings (updates open rounds; locked bets stay
              as they are).
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {LEGS_PER_MEMBER_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setLegsPerMember(n)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium ${
                    legsPerMember === n
                      ? "border-accent bg-accent-muted/40 text-accent"
                      : "border-border bg-card text-muted hover:text-foreground"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </fieldset>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent py-2.5 font-medium text-black hover:bg-green-400 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create group"}
          </button>
        </form>
      </main>
    </div>
  );
}
