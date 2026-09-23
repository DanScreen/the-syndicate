"use client";

import { GroupStats } from "@/components/group/stats";
import { Leaderboard } from "@/components/group/leaderboard";
import { useGroupData } from "@/context/group-data";

export default function GroupLeaderboardPage() {
  const { data } = useGroupData();
  if (!data) return null;

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-lg font-semibold">Leaderboard</h2>
        <p className="mt-1 text-sm text-muted">
          Who&apos;s ahead in this group — points from settled and in-progress legs.
        </p>
        <div className="mt-4">
          <Leaderboard entries={data.leaderboard} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Stats & trends</h2>
        <p className="mt-1 text-sm text-muted">
          Group charts, stake converter, and member breakdowns.
        </p>
        <div className="mt-4">
          <GroupStats groupId={data.group.id} groupName={data.group.name} />
        </div>
      </section>
    </div>
  );
}
