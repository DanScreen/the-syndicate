"use client";

import { GroupStats } from "@/components/group-stats";
import { useGroupData } from "@/context/group-data";

export default function GroupPerformancePage() {
  const { data } = useGroupData();
  if (!data) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold">Group performance</h2>
      <p className="mt-1 text-sm text-muted">Stats, charts, and member breakdowns.</p>
      <div className="mt-4">
        <GroupStats groupId={data.group.id} groupName={data.group.name} />
      </div>
    </section>
  );
}
