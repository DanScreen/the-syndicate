"use client";

import { CopyInviteButton } from "@/components/site-footer";
import { GroupNav } from "@/components/group-nav";
import { AppHeader } from "@/components/header";
import { GroupDataProvider, useGroupData } from "@/context/group-data";
import { greetingFirstName } from "@/lib/user-display";
import { formatRoundStatusBadge } from "@tiki-acca/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

function GroupShell({ groupId, children }: { groupId: string; children: React.ReactNode }) {
  const { data: session } = useSession();
  const { data, loading } = useGroupData();
  const [inviteUrl, setInviteUrl] = useState("");

  useEffect(() => {
    if (data?.group.inviteCode) {
      setInviteUrl(
        `${window.location.origin}/groups/join?code=${data.group.inviteCode}`
      );
    }
  }, [data?.group.inviteCode]);

  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        Loading group...
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader userName={greetingFirstName(session?.user ?? {})} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Link href="/dashboard" className="text-sm text-muted hover:text-foreground">
          ← All groups
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{data.group.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {data.group.memberCount} members ·{" "}
              <span className="text-accent">
                {formatRoundStatusBadge(data.activeRound?.status ?? data.group.status)}
              </span>
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

        <GroupNav
          groupId={groupId}
          showSettings={data.isOwner}
          unreadMessageCount={data.group.unreadMessageCount}
        />
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}

export function GroupLayoutClient({
  groupId,
  children,
}: {
  groupId: string;
  children: React.ReactNode;
}) {
  return (
    <GroupDataProvider groupId={groupId}>
      <GroupShell groupId={groupId}>{children}</GroupShell>
    </GroupDataProvider>
  );
}
