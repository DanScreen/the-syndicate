import { api } from "@/api/client";
import type { GroupSummary, GroupsListResponse } from "@tiki-acca/shared";
import {
  formatActiveLegSummary,
  formatLegPoints,
  formatRoundStatusBadge,
  legOutcomeShortLabel,
  pointsTone,
  yourLegStatusMessage,
} from "@tiki-acca/shared";
import { useAuth } from "@/auth/AuthProvider";
import { Button, Card, EmptyState, Screen } from "@/components/ui";
import { colors } from "@/config";
import { copy } from "@/lib/copy";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function GroupsScreen() {
  const { token, user } = useAuth();
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async () => {
    if (!token) return;
    const data = await api<GroupsListResponse>("/api/groups", { token });
    setGroups(data.groups);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!hasLoadedRef.current) setLoading(true);
      load()
        .catch(() => {
          if (!cancelled && !hasLoadedRef.current) setGroups([]);
        })
        .finally(() => {
          if (!cancelled) {
            hasLoadedRef.current = true;
            setLoading(false);
          }
        });
      return () => {
        cancelled = true;
      };
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  if (loading && !hasLoadedRef.current) {
    return (
      <Screen>
        <View style={styles.loadingHold}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loadingText}>Loading your groups…</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        contentContainerStyle={styles.scroll}
      >
        <Text style={styles.sectionLabel}>Your groups</Text>
        {groups.length === 0 ? (
          <EmptyState
            title={copy.dashboard.emptyTitle}
            message={copy.dashboard.emptyBody}
          />
        ) : (
          groups.map((g) => {
            const legs = g.activeLegs ?? [];
            const waiting = yourLegStatusMessage(g.status, g.yourLeg, {
              yourLegCount: g.yourLegCount,
              legsPerMember:
                g.activeRound?.legsPerMember ?? g.legsPerMember ?? 1,
            });
            return (
              <Pressable
                key={g.id}
                onPress={() => router.push(`/(main)/groups/${g.id}`)}
                style={{ marginBottom: 12 }}
              >
                <Card>
                  <View style={styles.row}>
                    <Text style={styles.groupName}>{g.name}</Text>
                    <View style={styles.badgeRow}>
                      {g.unreadMessageCount > 0 ? (
                        <Text style={styles.unreadBadge}>
                          {g.unreadMessageCount} new
                        </Text>
                      ) : null}
                      <Text style={styles.badge}>{formatRoundStatusBadge(g.status)}</Text>
                    </View>
                  </View>
                  <Text style={styles.meta}>
                    {g.memberCount} members · Owner: {g.ownerName}
                  </Text>
                  <View style={styles.pointsRow}>
                    <Text style={[styles.points, pointsStyle(g.groupPoints)]}>
                      Group points: {formatLegPoints(g.groupPoints)}
                    </Text>
                    <Text style={[styles.points, pointsStyle(g.points)]}>
                      Your points: {formatLegPoints(g.points)}
                    </Text>
                  </View>
                  {legs.length > 0 ? (
                    <View style={styles.betslip}>
                      <View style={styles.betslipHeader}>
                        <Text style={styles.betslipTitle}>
                          Current betslip · {legs.length} leg{legs.length === 1 ? "" : "s"}
                        </Text>
                        {g.activeRound?.combinedOdds != null ? (
                          <Text style={styles.meta}>Acca @ {g.activeRound.combinedOdds}</Text>
                        ) : null}
                      </View>
                      {legs.map((leg) => {
                        const outcome = legOutcomeShortLabel(leg.outcome);
                        const yours = user?.id === leg.userId;
                        return (
                          <View
                            key={`${leg.userId}-${leg.selectionLabel}-${leg.odds}`}
                            style={styles.betslipLeg}
                          >
                            <Text style={styles.betslipUser}>
                              {yours ? "You" : leg.userName}
                              {outcome ? (
                                <Text
                                  style={
                                    leg.outcome === "won"
                                      ? styles.outcomeWon
                                      : leg.outcome === "lost"
                                        ? styles.outcomeLost
                                        : styles.meta
                                  }
                                >
                                  {` · ${outcome}`}
                                </Text>
                              ) : null}
                            </Text>
                            <Text style={styles.betslipDetail}>
                              {formatActiveLegSummary(leg)}
                            </Text>
                          </View>
                        );
                      })}
                      {waiting ? <Text style={styles.waitingOpen}>{waiting}</Text> : null}
                    </View>
                  ) : waiting ? (
                    <Text
                      style={[
                        styles.waiting,
                        g.status === "open" ? styles.waitingOpen : styles.waitingMuted,
                      ]}
                    >
                      {waiting}
                    </Text>
                  ) : null}
                </Card>
              </Pressable>
            );
          })
        )}

        <View style={styles.actions}>
          <Button label="Create group" onPress={() => router.push("/(main)/create-group")} />
          <Button
            label="Join group"
            variant="secondary"
            onPress={() => router.push("/(main)/join-group")}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function pointsStyle(value: number) {
  const tone = pointsTone(value);
  if (tone === "positive") return { color: colors.success };
  if (tone === "negative") return { color: colors.danger };
  return { color: colors.muted };
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 32,
  },
  loadingHold: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 14,
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 4,
    marginBottom: 12,
  },
  actions: {
    gap: 8,
    marginTop: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  groupName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "600",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  unreadBadge: {
    color: "#fff",
    backgroundColor: colors.danger,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: "600",
  },
  badge: {
    color: colors.accent,
    fontSize: 12,
    backgroundColor: colors.accentMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 2,
  },
  pointsRow: {
    flexDirection: "row",
    gap: 24,
    marginTop: 8,
  },
  points: {
    fontSize: 14,
    fontWeight: "600",
  },
  betslip: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  betslipHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  betslipTitle: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  betslipLeg: {
    gap: 2,
  },
  betslipUser: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  betslipDetail: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  outcomeWon: {
    color: colors.success,
    fontWeight: "600",
  },
  outcomeLost: {
    color: colors.danger,
    fontWeight: "600",
  },
  waiting: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  waitingOpen: {
    color: colors.warning,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  waitingMuted: {
    color: colors.muted,
  },
});
