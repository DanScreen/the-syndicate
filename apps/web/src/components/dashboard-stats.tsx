"use client";

import {
  filterUserStatsByGroup,
  type UserStatsChartPoint,
  type UserStatsGroupBreakdown,
  type UserStatsSummary,
} from "@/lib/stats/compute-user-stats";
import { ShareCard } from "@/components/share-card";
import { StakeProfit } from "@/components/stake-profit";
import { formatLegPoints } from "@the-syndicate/shared";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type UserStatsData = {
  summary: UserStatsSummary;
  chart: UserStatsChartPoint[];
  groups: UserStatsGroupBreakdown[];
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: UserStatsChartPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const isOrigin = point.roundNumber === 0;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg">
      <p className="font-medium">{point.label}</p>
      {!isOrigin && point.groupName ? (
        <p className="text-xs text-muted">{point.groupName}</p>
      ) : null}
      {!isOrigin ? (
        <p className="mt-1 text-muted">Round: {formatLegPoints(point.roundPoints)} pts</p>
      ) : null}
      <p className={isOrigin ? "mt-1 text-muted" : "text-accent"}>
        Total: {formatLegPoints(point.cumulativePoints)} pts
      </p>
    </div>
  );
}

export function DashboardStats({ userName }: { userName: string }) {
  const [data, setData] = useState<UserStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState("all");

  useEffect(() => {
    fetch("/api/user/stats")
      .then(async (r) => {
        if (r.ok) setData(await r.json());
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return null;
    return filterUserStatsByGroup(
      data,
      selectedGroupId === "all" ? null : selectedGroupId
    );
  }, [data, selectedGroupId]);

  const selectedGroup = useMemo(() => {
    if (!data || selectedGroupId === "all") return null;
    return data.groups.find((group) => group.groupId === selectedGroupId) ?? null;
  }, [data, selectedGroupId]);

  if (loading) {
    return (
      <section className="mt-8 rounded-xl border border-border bg-card p-4 text-sm text-muted">
        Loading stats...
      </section>
    );
  }

  if (!data || !filtered || data.summary.legsPlayed === 0) {
    return (
      <section className="mt-8 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
        <p>No settled legs yet.</p>
        <p className="mt-2">Stats appear after your first round is settled.</p>
      </section>
    );
  }

  const { summary, chart, groups } = filtered;
  const viewingAll = selectedGroupId === "all";
  const shareTitle = selectedGroup
    ? `${selectedGroup.groupName} stats`
    : `${userName}'s syndicate stats`;
  const shareSubtitle = selectedGroup
    ? `${summary.settledRounds} settled round${summary.settledRounds === 1 ? "" : "s"}`
    : `Across ${summary.groupCount} group${summary.groupCount === 1 ? "" : "s"}`;

  return (
    <section className="space-y-6">
      {groups.length > 1 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label htmlFor="syndicate-filter" className="text-sm text-muted">
            Syndicate
          </label>
          <select
            id="syndicate-filter"
            value={selectedGroupId}
            onChange={(event) => setSelectedGroupId(event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm sm:max-w-xs"
          >
            <option value="all">All syndicates</option>
            {groups.map((group) => (
              <option key={group.groupId} value={group.groupId}>
                {group.groupName}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Groups" value={String(summary.groupCount)} />
        <StatCard label="Rounds" value={String(summary.settledRounds)} />
        <StatCard label="Legs" value={String(summary.legsPlayed)} />
        <StatCard
          label="Win rate"
          value={summary.winRate != null ? `${summary.winRate}%` : "—"}
        />
        <StatCard label="Net points" value={formatLegPoints(summary.netPoints)} />
      </div>

      <StakeProfit points={summary.netPoints} />

      {chart.length > 1 ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            {viewingAll ? "Cumulative points (all syndicates)" : "Cumulative points"}
          </p>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#1f2937" }}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#1f2937" }}
                  width={36}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="cumulativePoints"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: "#22c55e", r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      <ShareCard
        title={shareTitle}
        netPoints={summary.netPoints}
        legsPlayed={summary.legsPlayed}
        winRate={summary.winRate}
        subtitle={shareSubtitle}
        chart={chart}
      />

      {viewingAll && groups.length > 1 ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
            By group
          </p>
          <div className="space-y-2">
            {groups.map((g) => (
              <Link
                key={g.groupId}
                href={`/groups/${g.groupId}`}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:border-accent/40"
              >
                <span className="font-medium">{g.groupName}</span>
                <span className="text-muted">
                  {formatLegPoints(g.netPoints)} pts · {g.legsPlayed} legs
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
