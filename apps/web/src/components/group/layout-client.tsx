"use client";

import { GroupNav } from "@/components/group/nav";
import { AppHeader } from "@/components/layout/header";
import { apiFetcher } from "@/lib/api-client";
import { GroupDataProvider, useGroupData } from "@tiki-acca/client";
import { greetingFirstName } from "@/lib/user-display";
import { formatRoundStatusBadge } from "@tiki-acca/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useSession } from "next-auth/react";

function GroupShell({ groupId, children }: { groupId: string; children: React.ReactNode }) {
  const { data: session } = useSession();
  const { data, loading, error } = useGroupData();
  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        {!loading && error ? error : "Loading group..."}
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

        <div className="mt-4">
          <h1 className="text-2xl font-bold">{data.group.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {data.group.memberCount} members ·{" "}
            <span className="text-accent">
              {formatRoundStatusBadge(data.activeRound?.status ?? data.group.status)}
            </span>
          </p>
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
  const router = useRouter();
  const leaveGroup = useCallback(() => router.push("/dashboard"), [router]);
  return (
    <GroupDataProvider groupId={groupId} fetcher={apiFetcher} onUnavailable={leaveGroup}>
      <GroupShell groupId={groupId}>{children}</GroupShell>
    </GroupDataProvider>
  );
}
