"use client";

import { Leaderboard } from "@/components/group-ui";
import { useGroupData } from "@/context/group-data";

export default function GroupLeaderboardPage() {
  const { data } = useGroupData();
  if (!data) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold">Leaderboard</h2>
      <p className="mt-1 text-sm text-muted">Points from settled legs in this group.</p>
      <div className="mt-4">
        <Leaderboard entries={data.leaderboard} />
      </div>
    </section>
  );
}
