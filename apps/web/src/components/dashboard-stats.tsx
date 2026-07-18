"use client";

import {
  filterUserStatsByGroup,
  type UserCategoryStats,
  type UserStatsChartPoint,
  type UserStatsGroupBreakdown,
  type UserStatsSummary,
} from "@/lib/stats/compute-user-stats";
import { ShareCard } from "@/components/share-card";
import { StakeProfit } from "@/components/stake-profit";
import { BRAND_COLORS, formatLegPoints } from "@tiki-acca/shared";
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
  competition: UserCategoryStats;
  market: UserCategoryStats;
  team: UserCategoryStats;
};

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
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      {detail ? <p className="mt-1 text-xs leading-snug text-muted">{detail}</p> : null}
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
  bestWorst: UserCategoryStats["bestWorst"];
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-3 text-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1">
        Most picked: <span className="text-foreground">{favourite ?? "—"}</span>
      </p>
      {bestWorst ? (
        <div className="mt-2 space-y-1 text-muted">
          <p>
            Best: <span className="text-accent">{bestWorst.best.key}</span>
            {" · "}
            {formatLegPoints(bestWorst.best.avgPoints)} avg / leg
            <span className="text-muted/80"> ({bestWorst.best.legs})</span>
          </p>
          <p>
            Worst: <span className="text-danger">{bestWorst.worst.key}</span>
            {" · "}
            {formatLegPoints(bestWorst.worst.avgPoints)} avg / leg
            <span className="text-muted/80"> ({bestWorst.worst.legs})</span>
          </p>
        </div>
      ) : (
        <p className="mt-1 text-xs text-muted">
          Best/worst needs 3+ legs in two different categories
        </p>
      )}
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
      {!isOrigin && point.dateLabel ? (
        <p className="text-xs text-muted">{point.dateLabel}</p>
      ) : null}
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

  const { summary, chart, groups, competition, market, team } = filtered;
  const viewingAll = selectedGroupId === "all";
  const shareTitle = selectedGroup
    ? `${selectedGroup.groupName} stats`
    : `${userName}'s performance`;
  const shareSubtitle = selectedGroup
    ? `${summary.settledRounds} settled round${summary.settledRounds === 1 ? "" : "s"}`
    : `Across ${summary.groupCount} group${summary.groupCount === 1 ? "" : "s"}`;

  return (
    <section className="space-y-6">
      {groups.length > 1 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label htmlFor="group-filter" className="text-sm text-muted">
            Group
          </label>
          <select
            id="group-filter"
            value={selectedGroupId}
            onChange={(event) => setSelectedGroupId(event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm sm:max-w-xs"
          >
            <option value="all">All groups</option>
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
          label="Avg pts / leg"
          value={
            summary.averagePointsPerLeg != null
              ? formatLegPoints(summary.averagePointsPerLeg)
              : "—"
          }
        />
        <StatCard
          label="Pick win rate"
          value={summary.winRate != null ? `${summary.winRate}%` : "—"}
          detail="Your legs only — ignores group acca results"
        />
        <StatCard label="Net points" value={formatLegPoints(summary.netPoints)} />
        {summary.averageOdds != null ? (
          <StatCard label="Avg odds" value={String(summary.averageOdds)} />
        ) : null}
      </div>

      <StakeProfit points={summary.netPoints} />

      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Your insights
          </p>
          <p className="mt-1 text-xs text-muted">
            Based on your individual picks across{" "}
            {viewingAll ? "all groups" : "this group"} (won = odds − 1, lost = −1). Best/worst
            need 3+ settled legs in at least two categories.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <CategoryRow
            label="Competition"
            favourite={competition.favourite}
            bestWorst={competition.bestWorst}
          />
          <CategoryRow
            label="Bet type"
            favourite={market.favourite}
            bestWorst={market.bestWorst}
          />
          <CategoryRow
            label="Team"
            favourite={team.favourite}
            bestWorst={team.bestWorst}
          />
        </div>
      </div>

      {chart.length > 1 ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            {viewingAll ? "Cumulative points (all groups)" : "Cumulative points"}
          </p>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={BRAND_COLORS.border} strokeDasharray="3 3" />
                <XAxis
                  dataKey="roundNumber"
                  tickFormatter={(n: number) => (n === 0 ? "Start" : String(n))}
                  tick={{ fill: BRAND_COLORS.muted, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: BRAND_COLORS.border }}
                />
                <YAxis
                  tick={{ fill: BRAND_COLORS.muted, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: BRAND_COLORS.border }}
                  width={36}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="cumulativePoints"
                  stroke={BRAND_COLORS.accent}
                  strokeWidth={2}
                  dot={{ fill: BRAND_COLORS.accent, r: 3 }}
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
                  {g.winRate != null ? ` · ${g.winRate}% picks` : ""}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
