import { AdminPageShell } from "@/components/admin-page-shell";
import { PlatformLeaderboards } from "@/components/platform-leaderboards";
import { computePlatformLeaderboards } from "@/lib/admin/compute-platform-leaderboards";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin leaderboards",
  robots: { index: false, follow: false },
};

export default async function AdminLeaderboardsPage() {
  const leaderboards = await computePlatformLeaderboards();

  return (
    <AdminPageShell
      title="Platform leaderboards"
      description="Syndicate and player rankings by points. Admin-only until we have more users."
      path="/admin/leaderboards"
    >
      <PlatformLeaderboards data={leaderboards} />
    </AdminPageShell>
  );
}
