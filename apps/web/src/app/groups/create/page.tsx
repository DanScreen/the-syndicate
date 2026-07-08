"use client";

import { AppHeader } from "@/components/header";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreateGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [maxMembers, setMaxMembers] = useState(6);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, maxMembers }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to create group");
      return;
    }

    router.push(`/groups/${data.group.id}`);
  }

  return (
    <div className="min-h-screen">
      <AppHeader userName="" />
      <main className="mx-auto max-w-md px-4 py-8">
        <h1 className="text-2xl font-bold">Create a group</h1>
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
          <div>
            <label className="text-sm text-muted">Max members</label>
            <input
              type="number"
              min={2}
              max={20}
              value={maxMembers}
              onChange={(e) => setMaxMembers(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2"
            />
          </div>
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
