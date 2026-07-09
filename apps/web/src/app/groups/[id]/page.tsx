"use client";

import { GroupStats } from "@/components/group-stats";
import { AppHeader } from "@/components/header";
import {
  AccaSummary,
  Leaderboard,
  LegsList,
  RoundHistory,
  RoundProgress,
  SettleRoundForm,
  SubmitLegForm,
} from "@/components/group-ui";
import { CopyInviteButton } from "@/components/site-footer";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type GroupData = {
  group: {
    id: string;
    name: string;
    inviteCode: string;
    status: string;
    maxMembers: number;
    memberCount: number;
    members: { id: string; name: string; role: string }[];
    owner: { id: string; name: string };
  };
  leaderboard: {
    userId: string;
    name: string;
    points: number;
    legsWon: number;
    legsLost: number;
    role: string;
  }[];
  activeRound: {
    id: string;
    status: string;
    combinedOdds: number | null;
    bestBookmakerId: string | null;
    profitLossGbp: number | null;
    accaBookmakerRankings?: { bookmakerId: string; bookmakerName: string; combinedOdds: number }[] | null;
    legs: {
      id: string;
      user: { id: string; name: string };
      homeTeam: string;
      awayTeam: string;
      competition: string;
      selectionLabel: string;
      marketLabel: string;
      odds: number;
      bookmakerName: string;
      outcome: string;
      pointsAwarded: number;
    }[];
  } | null;
  recentRounds: {
    id: string;
    status: string;
    combinedOdds: number | null;
    profitLossGbp: number | null;
    legs: { selectionLabel: string; outcome: string }[];
  }[];
  betslipLink: string | null;
  isOwner: boolean;
};

export default function GroupPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const groupId = params.id as string;
  const [data, setData] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/groups/${groupId}`);
    if (res.status === 403 || res.status === 404) {
      router.push("/dashboard");
      return;
    }
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [groupId, router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setInviteUrl(`${window.location.origin}/groups/join?code=${data?.group.inviteCode ?? ""}`);
  }, [data?.group.inviteCode]);

  async function startRound() {
    setActionLoading(true);
    const res = await fetch(`/api/groups/${groupId}/rounds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId }),
    });
    setActionLoading(false);
    if (res.ok) load();
  }

  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        Loading group...
      </div>
    );
  }

  const userId = session?.user?.id;
  const hasSubmitted = data.activeRound?.legs.some((l) => l.user.id === userId);

  return (
    <div className="min-h-screen">
      <AppHeader userName={session?.user?.name ?? "Player"} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Link href="/dashboard" className="text-sm text-muted hover:text-foreground">
          ← Back to dashboard
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{data.group.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {data.group.memberCount}/{data.group.maxMembers} members · Status:{" "}
              <span className="text-accent">{data.group.status}</span>
            </p>
          </div>
          <div className="w-full max-w-xs rounded-xl border border-border bg-card px-4 py-3 text-sm">
            <p className="text-muted">Invite code</p>
            <p className="font-mono text-lg tracking-widest text-accent">
              {data.group.inviteCode}
            </p>
            {inviteUrl && <CopyInviteButton inviteUrl={inviteUrl} />}
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="text-lg font-semibold">Active round</h2>
            {!data.activeRound ? (
              <div className="mt-4 rounded-xl border border-dashed border-border p-6">
                <p className="text-sm text-muted">No active round.</p>
                {data.isOwner && (
                  <button
                    onClick={startRound}
                    disabled={actionLoading}
                    className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-green-400 disabled:opacity-50"
                  >
                    {actionLoading ? "Starting..." : "Start new round"}
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-border bg-card p-4 text-sm">
                  <p>
                    Status: <span className="text-accent">{data.activeRound.status}</span>
                  </p>
                  {data.activeRound.profitLossGbp != null && (
                    <p className="mt-1">
                      Group P/L: £{data.activeRound.profitLossGbp.toFixed(2)}
                    </p>
                  )}
                </div>

                {data.activeRound.status === "locked" && data.activeRound.combinedOdds && (
                  <AccaSummary
                    combinedOdds={data.activeRound.combinedOdds}
                    bookmakerId={data.activeRound.bestBookmakerId}
                    bookmakerName={data.activeRound.legs[0]?.bookmakerName}
                    singleBookmaker={Boolean(data.activeRound.bestBookmakerId)}
                    bookmakerRankings={data.activeRound.accaBookmakerRankings ?? []}
                  />
                )}

                <RoundProgress
                  members={data.group.members}
                  legs={data.activeRound.legs}
                  status={data.activeRound.status}
                />

                <LegsList legs={data.activeRound.legs} />

                {data.activeRound.status === "collecting" && userId && !hasSubmitted && (
                  <SubmitLegForm roundId={data.activeRound.id} onSubmitted={load} />
                )}

                {data.activeRound.status === "locked" && data.betslipLink && (
                  <a
                    href={data.betslipLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg bg-accent px-4 py-3 text-center text-sm font-medium text-black hover:bg-green-400"
                  >
                    Open betslip at {data.activeRound.legs[0]?.bookmakerName ?? data.activeRound.bestBookmakerId}
                  </a>
                )}

                {data.activeRound.status === "locked" && data.isOwner && (
                  <SettleRoundForm round={data.activeRound} onSettled={load} />
                )}

                {data.activeRound.status === "settled" && data.isOwner && (
                  <button
                    onClick={startRound}
                    disabled={actionLoading}
                    className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-card"
                  >
                    Start next round
                  </button>
                )}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold">Leaderboard</h2>
            <div className="mt-4">
              <Leaderboard entries={data.leaderboard} />
            </div>
          </section>
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Performance</h2>
          <div className="mt-4">
            <GroupStats groupId={groupId} />
          </div>
        </section>

        <RoundHistory rounds={data.recentRounds} />
      </main>
    </div>
  );
}
