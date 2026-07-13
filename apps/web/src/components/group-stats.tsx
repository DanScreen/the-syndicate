"use client";

import type { GroupStatsChartPoint, GroupStatsSummary } from "@/lib/stats/compute-group-stats";
import type { MemberChartPoint, MemberSeries } from "@/lib/stats/compute-member-chart";
import type { MemberStatsResult } from "@/lib/stats/compute-member-stats";
import { ShareCard } from "@/components/share-card";
import { StakeProfit } from "@/components/stake-profit";
import { formatLegHighlight, formatLegPoints } from "@the-syndicate/shared";
import type { LegHighlight } from "@the-syndicate/shared";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const MEMBER_COLORS = [
  "#22c55e",
  "#38bdf8",
  "#fbbf24",
  "#a78bfa",
  "#f472b6",
  "#fb923c",
  "#34d399",
  "#60a5fa",
];

type GroupStatsData = {
  summary: GroupStatsSummary;
  chart: GroupStatsChartPoint[];
  members: MemberSeries[];
  memberChart: MemberChartPoint[];
};

type MemberStatsData = MemberStatsResult & { name: string };

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/50 px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      {detail ? <p className="mt-1 text-xs leading-snug text-muted">{detail}</p> : null}
    </div>
  );
}

function legHighlightStat(leg: LegHighlight | null) {
  if (!leg) return { value: "—" as const };
  return { value: String(leg.odds), detail: formatLegHighlight(leg) };
}

function GroupChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: GroupStatsChartPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const isOrigin = point.roundNumber === 0;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg">
      <p className="font-medium">{point.label}</p>
      {!isOrigin ? (
        <p className="mt-1 text-muted">Round: {formatLegPoints(point.roundPoints)} pts</p>
      ) : null}
      <p className={isOrigin ? "mt-1 text-muted" : "text-accent"}>
        Total: {formatLegPoints(point.cumulativePoints)} pts
      </p>
    </div>
  );
}

function MemberChartTooltip({
  active,
  payload,
  label,
  members,
}: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: readonly any[];
  label?: string;
  members: MemberSeries[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg">
      <p className="font-medium">{label}</p>
      <ul className="mt-2 space-y-1">
        {payload.map((entry) => {
          const key = String(entry.dataKey ?? "");
          const member = members.find((m) => m.userId === key);
          return (
            <li key={key} style={{ color: entry.color }}>
              {member?.name ?? key}: {formatLegPoints(entry.value ?? 0)} pts
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CategoryRow({
  label,
  favourite,
  bestWorst,
}: {
  label: string;
  favourite: string | null;
  bestWorst: { best: string; worst: string } | null;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/50 px-3 py-2 text-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1">
        Favourite: <span className="text-foreground">{favourite ?? "—"}</span>
      </p>
      {bestWorst ? (
        <p className="mt-1 text-muted">
          Best: <span className="text-accent">{bestWorst.best}</span> · Worst:{" "}
          <span className="text-red-400">{bestWorst.worst}</span>
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted">Best/worst after 3+ legs</p>
      )}
    </div>
  );
}

function MemberBreakdown({
  groupId,
  member,
}: {
  groupId: string;
  member: MemberSeries;
}) {
  const [data, setData] = useState<MemberStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/groups/${groupId}/members/${member.userId}/stats`)
      .then(async (r) => {
        const json = await r.json();
        if (r.ok) setData(json);
        else setData(null);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [groupId, member.userId]);

  if (loading) {
    return <p className="text-sm text-muted">Loading {member.name}...</p>;
  }

  if (!data || data.summary.legsPlayed === 0) {
    return (
      <p className="text-sm text-muted">{member.name} has no settled legs yet.</p>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background/30 p-4">
      <h4 className="font-medium">{data.name}</h4>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Net points" value={formatLegPoints(data.summary.netPoints)} />
        <StatCard label="Legs" value={String(data.summary.legsPlayed)} />
        <StatCard
          label="Win rate"
          value={data.summary.winRate != null ? `${data.summary.winRate}%` : "—"}
        />
        <StatCard
          label="Avg odds"
          value={data.summary.averageOdds != null ? String(data.summary.averageOdds) : "—"}
        />
        <StatCard
          label="Best leg"
          {...legHighlightStat(data.summary.bestLeg)}
        />
        <StatCard
          label="Worst leg"
          {...legHighlightStat(data.summary.worstLeg)}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <CategoryRow
          label="Competition"
          favourite={data.competition.favourite}
          bestWorst={data.competition.bestWorst}
        />
        <CategoryRow
          label="Market"
          favourite={data.market.favourite}
          bestWorst={data.market.bestWorst}
        />
        <CategoryRow
          label="Team"
          favourite={data.team.favourite}
          bestWorst={data.team.bestWorst}
        />
      </div>
    </div>
  );
}

export function GroupStats({ groupId, groupName }: { groupId: string; groupName?: string }) {
  const [data, setData] = useState<GroupStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/groups/${groupId}/stats`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) {
          setError(json.error ?? "Failed to load stats");
          return;
        }
        setData(json);
        if (json.members?.length > 0) {
          setSelectedMemberId(json.members[0].userId);
        }
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

  const { summary, chart, members, memberChart } = data;
  const selectedMember = members.find((m) => m.userId === selectedMemberId);

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-4">
      <h3 className="font-semibold">Group stats</h3>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Rounds" value={String(summary.totalRounds)} />
        <StatCard label="Legs" value={String(summary.totalBets)} />
        <StatCard
          label="Win rate"
          value={summary.winRate != null ? `${summary.winRate}%` : "—"}
        />
        <StatCard label="Net points" value={formatLegPoints(summary.netGroupPoints)} />
        <StatCard
          label="Avg leg odds"
          value={summary.averageLegOdds != null ? String(summary.averageLegOdds) : "—"}
        />
        <StatCard
          label="Avg acca odds"
          value={summary.averageAccaOdds != null ? String(summary.averageAccaOdds) : "—"}
        />
      </div>

      <StakeProfit points={summary.netGroupPoints} />

      {chart.length > 0 && (
        <div className="h-56 w-full">
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
              <Tooltip content={<GroupChartTooltip />} />
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

      {members.length > 0 && memberChart.length > 0 && (
        <div className="h-64 w-full">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Member points over time
          </p>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={memberChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
              <Tooltip
                content={(props) => (
                  <MemberChartTooltip
                    active={props.active}
                    payload={props.payload}
                    label={typeof props.label === "string" ? props.label : undefined}
                    members={members}
                  />
                )}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {members.map((member, i) => (
                <Line
                  key={member.userId}
                  type="monotone"
                  dataKey={member.userId}
                  name={member.name}
                  stroke={MEMBER_COLORS[i % MEMBER_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {members.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Member breakdown
          </p>
          <div className="flex flex-wrap gap-2">
            {members.map((member) => (
              <button
                key={member.userId}
                type="button"
                onClick={() => setSelectedMemberId(member.userId)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  selectedMemberId === member.userId
                    ? "border-accent bg-accent-muted/30 text-accent"
                    : "border-border hover:border-accent/40"
                }`}
              >
                {member.name}
              </button>
            ))}
          </div>
          {selectedMember && (
            <MemberBreakdown groupId={groupId} member={selectedMember} />
          )}
        </div>
      )}

      <ShareCard
        title={groupName ? `${groupName} stats` : "Group stats"}
        netPoints={summary.netGroupPoints}
        legsPlayed={summary.totalBets}
        winRate={summary.winRate}
        subtitle={`${summary.totalRounds} settled round${summary.totalRounds === 1 ? "" : "s"}`}
        chart={chart}
      />
    </div>
  );
}
