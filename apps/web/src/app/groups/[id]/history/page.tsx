"use client";

import { GroupBetHistory } from "@/components/group-history";
import { useGroupData } from "@/context/group-data";
import type { GroupHistoryResponse, HistoryRound } from "@tiki-acca/shared";
import { useEffect, useState } from "react";

export default function GroupHistoryPage() {
  const { data } = useGroupData();
  const [rounds, setRounds] = useState<HistoryRound[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!data?.group.id) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/groups/${data.group.id}/history`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load history");
        return (await res.json()) as GroupHistoryResponse;
      })
      .then((json) => {
        if (!cancelled) setRounds(json.rounds);
      })
      .catch(() => {
        if (!cancelled) setRounds([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [data?.group.id]);

  if (!data) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold">Bet History</h2>
      <p className="mt-1 text-sm text-muted">
        Every settled acca for this group: fixtures, markets, and outcomes.
      </p>
      <div className="mt-4">
        <GroupBetHistory rounds={rounds} loading={loading} />
      </div>
    </section>
  );
}
