import { ApiError, api } from "@/api/client";
import { PointsLineChart } from "@/components/points-chart";
import { Card, EmptyState, ErrorText, OptionRow } from "@/components/ui";
import { colors } from "@/config";
import { copy } from "@/lib/copy";
import type {
  GroupStatsChartPoint,
  GroupStatsResponse,
  MemberSeries,
  MemberStatsResponse,
  UserStatsResponse,
} from "@tiki-acca/shared";
import {
  formatLegHighlight,
  formatLegPoints,
  formatProfitGbp,
  profitFromPoints,
} from "@tiki-acca/shared";
import type { LegHighlight } from "@tiki-acca/shared";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

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
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {detail ? <Text style={styles.statDetail}>{detail}</Text> : null}
    </View>
  );
}

function legHighlightStat(leg: LegHighlight | null) {
  if (!leg) return { value: "—" as const };
  return { value: String(leg.odds), detail: formatLegHighlight(leg) };
}

function StakeProfit({ points }: { points: number }) {
  const [stake, setStake] = useState("10");
  const stakeNum = Math.max(1, Number(stake) || 1);
  const profit = profitFromPoints(points, stakeNum);

  return (
    <Card>
      <Text style={styles.blockTitle}>Convert points to profit</Text>
      <Text style={styles.meta}>
        {formatLegPoints(points)} pts × your stake per point
      </Text>
      <View style={styles.stakeRow}>
        <Text style={styles.meta}>Stake £</Text>
        <TextInput
          style={styles.stakeInput}
          keyboardType="number-pad"
          value={stake}
          onChangeText={setStake}
        />
        <Text style={[styles.profitValue, profit < 0 && styles.lossText]}>
          {formatProfitGbp(profit)}
        </Text>
      </View>
    </Card>
  );
}

function ChartPointsList({
  title,
  points,
  minPoints = 1,
}: {
  title: string;
  points: { label: string; roundPoints: number; cumulativePoints: number; subtitle?: string }[];
  minPoints?: number;
}) {
  return (
    <PointsLineChart
      title={title}
      minPoints={minPoints}
      points={points.map((p) => ({
        label: p.label,
        roundPoints: p.roundPoints,
        cumulativePoints: p.cumulativePoints,
        subtitle: p.subtitle,
      }))}
    />
  );
}

function CategoryRow({
  label,
  favourite,
  bestWorst,
}: {
  label: string;
  favourite: string | null;
  bestWorst: MemberStatsResponse["competition"]["bestWorst"];
}) {
  return (
    <View style={styles.categoryCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.meta}>
        Most picked: <Text style={styles.text}>{favourite ?? "—"}</Text>
      </Text>
      {bestWorst ? (
        <>
          <Text style={styles.meta}>
            Best: <Text style={styles.odds}>{bestWorst.best.key}</Text>
            {" · "}
            {formatLegPoints(bestWorst.best.avgPoints)} avg ({bestWorst.best.legs})
          </Text>
          <Text style={styles.meta}>
            Worst: <Text style={styles.lossText}>{bestWorst.worst.key}</Text>
            {" · "}
            {formatLegPoints(bestWorst.worst.avgPoints)} avg ({bestWorst.worst.legs})
          </Text>
        </>
      ) : (
        <Text style={styles.meta}>Best/worst needs 3+ legs in two categories</Text>
      )}
    </View>
  );
}

function MemberBreakdown({
  groupId,
  member,
  token,
}: {
  groupId: string;
  member: MemberSeries;
  token: string;
}) {
  const [data, setData] = useState<MemberStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api<MemberStatsResponse>(`/api/groups/${groupId}/members/${member.userId}/stats`, {
      token,
    })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [groupId, member.userId, token]);

  if (loading) {
    return <Text style={styles.meta}>Loading {member.name}…</Text>;
  }

  if (!data || data.summary.legsPlayed === 0) {
    return <Text style={styles.meta}>{member.name} has no settled legs yet.</Text>;
  }

  return (
    <View style={styles.memberBlock}>
      <Text style={styles.blockTitle}>{data.name}</Text>
      <View style={styles.statGrid}>
        <StatCard label="Net points" value={formatLegPoints(data.summary.netPoints)} />
        <StatCard
          label="Avg pts / leg"
          value={
            data.summary.averagePointsPerLeg != null
              ? formatLegPoints(data.summary.averagePointsPerLeg)
              : "—"
          }
        />
        <StatCard label="Legs" value={String(data.summary.legsPlayed)} />
        <StatCard
          label="Pick win rate"
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
      </View>
      <Text style={styles.meta}>
        Based on your individual picks (not group acca results). Best/worst need 3+ legs in
        two categories.
      </Text>
      <CategoryRow
        label="Competition"
        favourite={data.competition.favourite}
        bestWorst={data.competition.bestWorst}
      />
      <CategoryRow
        label="Bet type"
        favourite={data.market.favourite}
        bestWorst={data.market.bestWorst}
      />
      <CategoryRow
        label="Team"
        favourite={data.team.favourite}
        bestWorst={data.team.bestWorst}
      />
    </View>
  );
}

export function GroupStatsPanel({
  groupId,
  token,
}: {
  groupId: string;
  token: string;
}) {
  const [data, setData] = useState<GroupStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  useEffect(() => {
    api<GroupStatsResponse>(`/api/groups/${groupId}/stats`, { token })
      .then((json) => {
        setData(json);
        if (json.members?.length > 0) {
          setSelectedMemberId(json.members[0]!.userId);
        }
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : copy.stats.loadFailed)
      )
      .finally(() => setLoading(false));
  }, [groupId, token]);

  if (loading) {
    return <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />;
  }

  if (error) {
    return <ErrorText message={error} />;
  }

  if (!data || data.summary.totalRounds === 0) {
    return <EmptyState title={copy.stats.noGroupRounds} />;
  }

  const { summary, chart, members, memberChart } = data;
  const selectedMember = members.find((m) => m.userId === selectedMemberId);

  return (
    <View style={styles.stack}>
      <View style={styles.statGrid}>
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
      </View>

      <StakeProfit points={summary.netGroupPoints} />

      <ChartPointsList
        title="Cumulative group points"
        minPoints={1}
        points={chart.map((p: GroupStatsChartPoint) => ({
          label: p.label,
          subtitle: p.dateLabel || undefined,
          roundPoints: p.roundPoints,
          cumulativePoints: p.cumulativePoints,
        }))}
      />

      {members.length > 0 && memberChart.length > 0 ? (
        <Card>
          <Text style={styles.blockTitle}>Member points over time</Text>
          {memberChart.map((point, i) => (
            <View key={i} style={styles.chartRow}>
              <Text style={styles.chartLabel}>{point.label}</Text>
              {point.dateLabel ? (
                <Text style={styles.meta}>{point.dateLabel}</Text>
              ) : null}
              <View style={styles.memberChartValues}>
                {members.map((m) => (
                  <Text key={m.userId} style={styles.meta}>
                    {m.name}: {formatLegPoints(Number(point[m.userId] ?? 0))}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {members.length > 0 ? (
        <View style={styles.stack}>
          <Text style={styles.blockTitle}>Member breakdown</Text>
          {members.map((member) => (
            <OptionRow
              key={member.userId}
              label={member.name}
              selected={selectedMemberId === member.userId}
              onPress={() => setSelectedMemberId(member.userId)}
            />
          ))}
          {selectedMember ? (
            <MemberBreakdown groupId={groupId} member={selectedMember} token={token} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

let cachedUserStats: { token: string; data: UserStatsResponse } | null = null;

function PerformanceSkeleton() {
  return (
    <View style={styles.stack}>
      <View style={styles.statGrid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={[styles.statCard, styles.skeletonBlock]} />
        ))}
      </View>
      <View style={[styles.skeletonBlock, { height: 72 }]} />
      <View style={[styles.skeletonBlock, { height: 72 }]} />
      <View style={[styles.skeletonBlock, { height: 72 }]} />
      <View style={[styles.skeletonBlock, { height: 120 }]} />
      <View style={[styles.skeletonBlock, { height: 160 }]} />
    </View>
  );
}

export function UserPerformancePanel({
  token,
  userName,
}: {
  token: string;
  userName: string;
}) {
  const [data, setData] = useState<UserStatsResponse | null>(() =>
    cachedUserStats?.token === token ? cachedUserStats.data : null
  );
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!data) setLoading(true);
    api<UserStatsResponse>("/api/user/stats", { token })
      .then((next) => {
        if (cancelled) return;
        cachedUserStats = { token, data: next };
        setData(next);
        setError("");
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof ApiError ? e.message : copy.stats.loadFailed);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Re-fetch when token changes; keep cached data on remount for stable layout
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (loading && !data) {
    return <PerformanceSkeleton />;
  }

  if (error && !data) {
    return <ErrorText message={error} />;
  }

  if (!data || data.summary.legsPlayed === 0) {
    return <EmptyState title={copy.stats.noUserLegs} />;
  }

  const { summary, chart, groups } = data;

  return (
    <View style={styles.stack}>
      <View style={styles.statGrid}>
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
        />
        <StatCard label="Net points" value={formatLegPoints(summary.netPoints)} />
      </View>

      <Text style={styles.meta}>
        Based on your individual picks across groups (not group acca results). Best/worst need
        3+ legs in two categories.
      </Text>

      <CategoryRow
        label="Competition"
        favourite={data.competition.favourite}
        bestWorst={data.competition.bestWorst}
      />
      <CategoryRow
        label="Bet type"
        favourite={data.market.favourite}
        bestWorst={data.market.bestWorst}
      />
      <CategoryRow
        label="Team"
        favourite={data.team.favourite}
        bestWorst={data.team.bestWorst}
      />

      <StakeProfit points={summary.netPoints} />

      <ChartPointsList
        title="Cumulative points (all groups)"
        minPoints={2}
        points={chart.map((p) => ({
          label: p.label,
          subtitle: [p.dateLabel, p.groupName].filter(Boolean).join(" · ") || undefined,
          roundPoints: p.roundPoints,
          cumulativePoints: p.cumulativePoints,
        }))}
      />

      <Card>
        <Text style={styles.blockTitle}>{userName}&apos;s performance</Text>
        <Text style={styles.meta}>
          {formatLegPoints(summary.netPoints)} pts · {summary.legsPlayed} legs across{" "}
          {summary.groupCount} group{summary.groupCount === 1 ? "" : "s"}
        </Text>
      </Card>

      {groups.length > 1 ? (
        <Card>
          <Text style={styles.blockTitle}>By group</Text>
          {groups.map((g) => (
            <Pressable
              key={g.groupId}
              style={styles.groupLink}
              onPress={() => router.push(`/(main)/groups/${g.groupId}`)}
            >
              <Text style={styles.text}>{g.groupName}</Text>
              <Text style={styles.meta}>
                {formatLegPoints(g.netPoints)} pts · {g.legsPlayed} legs
                {g.winRate != null ? ` · ${g.winRate}% picks` : ""}
              </Text>
            </Pressable>
          ))}
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 12,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statCard: {
    width: "47%",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 10,
    minHeight: 64,
  },
  skeletonBlock: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    minHeight: 64,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
    marginTop: 4,
  },
  statDetail: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
  },
  blockTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
  },
  text: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  odds: {
    color: colors.accent,
    fontWeight: "600",
    fontSize: 14,
  },
  lossText: {
    color: colors.danger,
  },
  stakeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  stakeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.text,
    width: 72,
    fontSize: 16,
  },
  profitValue: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
  },
  chartRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  chartRowLeft: {
    flex: 1,
  },
  chartRowRight: {
    alignItems: "flex-end",
  },
  chartLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  memberChartValues: {
    flex: 1,
    alignItems: "flex-end",
    gap: 2,
  },
  categoryCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  memberBlock: {
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.bg,
  },
  groupLink: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
