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
import { LogoMark } from "@/components/logo";
import { Button, Card, EmptyState, Screen, Subtitle, Title } from "@/components/ui";
import { colors } from "@/config";
import { copy } from "@/lib/copy";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
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
  const { token, user, signOut } = useAuth();
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const data = await api<GroupsListResponse>("/api/groups", { token });
    setGroups(data.groups);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load()
        .catch(() => setGroups([]))
        .finally(() => setLoading(false));
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

  return (
    <Screen>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <LogoMark size={34} />
            <View>
              <Title>Dashboard</Title>
              <Subtitle>Welcome, {user?.firstName ?? user?.name}</Subtitle>
            </View>
          </View>
          <Pressable onPress={() => signOut().then(() => router.replace("/sign-in"))}>
            <Text style={styles.signOut}>Sign out</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>Your groups</Text>
        {loading ? (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        ) : groups.length === 0 ? (
          <EmptyState
            title={copy.dashboard.emptyTitle}
            message={copy.dashboard.emptyBody}
          />
        ) : (
          groups.map((g) => {
            const legs = g.activeLegs ?? [];
            const waiting = yourLegStatusMessage(g.status, g.yourLeg);
            return (
              <Pressable
                key={g.id}
                onPress={() => router.push(`/(main)/groups/${g.id}`)}
                style={{ marginBottom: 12 }}
              >
                <Card>
                  <View style={styles.row}>
                    <Text style={styles.groupName}>{g.name}</Text>
                    <Text style={styles.badge}>{formatRoundStatusBadge(g.status)}</Text>
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
          <Button
            label="Your performance"
            variant="secondary"
            onPress={() => router.push("/(main)/performance")}
          />
          <Button
            label="Notifications"
            variant="secondary"
            onPress={() => router.push("/(main)/notifications")}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function pointsStyle(value: number) {
  const tone = pointsTone(value);
  if (tone === "positive") return { color: colors.accent };
  if (tone === "negative") return { color: colors.danger };
  return { color: colors.muted };
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  signOut: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 8,
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 12,
  },
  loader: {
    marginVertical: 24,
  },
  actions: {
    gap: 8,
    marginTop: 24,
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
    color: colors.accent,
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
    color: "#fbbf24",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  waitingMuted: {
    color: colors.muted,
  },
});
