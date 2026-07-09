"use client";

import type { GroupStatsChartPoint, GroupStatsSummary } from "@/lib/stats/compute-group-stats";
import { formatLegPoints } from "@the-syndicate/shared";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type GroupStatsData = {
  summary: GroupStatsSummary;
  chart: GroupStatsChartPoint[];
};

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/50 px-3 py-2">
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
  payload?: { payload: GroupStatsChartPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg">
      <p className="font-medium">{point.label}</p>
      <p className="mt-1 text-muted">
        Round: {formatLegPoints(point.roundPoints)} pts
      </p>
      <p className="text-accent">Total: {formatLegPoints(point.cumulativePoints)} pts</p>
    </div>
  );
}

export function GroupStats({ groupId }: { groupId: string }) {
  const [data, setData] = useState<GroupStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/groups/${groupId}/stats`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) {
          setError(json.error ?? "Failed to load stats");
          return;
        }
        setData(json);
      })
      .catch(() => setError("Failed to load stats"))
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted">
        Loading group stats...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-red-400">
        {error}
      </div>
    );
  }

  if (!data || data.summary.totalRounds === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted">
        No settled rounds yet — stats appear after your first round is settled.
      </div>
    );
  }

  const { summary, chart } = data;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <h3 className="font-semibold">Group stats</h3>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Rounds" value={String(summary.totalRounds)} />
        <StatCard label="Legs" value={String(summary.totalBets)} />
        <StatCard
          label="Win rate"
          value={summary.winRate != null ? `${summary.winRate}%` : "—"}
        />
        <StatCard
          label="Net points"
          value={formatLegPoints(summary.netGroupPoints)}
        />
        <StatCard
          label="Avg leg odds"
          value={summary.averageLegOdds != null ? String(summary.averageLegOdds) : "—"}
        />
        <StatCard
          label="Avg acca odds"
          value={summary.averageAccaOdds != null ? String(summary.averageAccaOdds) : "—"}
        />
        <StatCard
          label="Acca P/L"
          value={`£${summary.netAccaPlGbp.toFixed(2)}`}
        />
      </div>

      {chart.length > 0 && (
        <div className="h-56 w-full pt-2">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Cumulative group points
          </p>
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
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
