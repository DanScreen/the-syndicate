import { api } from "@/api/client";
import type { GroupSummary, GroupsListResponse } from "@the-syndicate/shared";
import { formatLegPoints, formatRoundStatusBadge } from "@the-syndicate/shared";
import { useAuth } from "@/auth/AuthProvider";
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
          <View>
            <Title>Dashboard</Title>
            <Subtitle>Welcome, {user?.name}</Subtitle>
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
          groups.map((g) => (
            <Pressable
              key={g.id}
              onPress={() => router.push(`/(main)/groups/${g.id}`)}
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
                  <Text style={styles.points}>
                    Group points: {formatLegPoints(g.groupPoints)}
                  </Text>
                  <Text style={styles.points}>
                    Your points: {formatLegPoints(g.points)}
                  </Text>
                </View>
              </Card>
            </Pressable>
          ))
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
        </View>
      </ScrollView>
    </Screen>
  );
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
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
});
