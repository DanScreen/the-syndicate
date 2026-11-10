import {
  copy,
  formatLegPoints,
} from "@tiki-acca/shared";
import type { GroupsListResponse, GroupSummary } from "@tiki-acca/shared";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { HomeGroupCard } from "@/components/home-group-card";
import { pointsStyle } from "@/components/round/helpers";
import { Button, Card, Screen, Title } from "@/components/ui";
import { colors } from "@/config";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
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

  // Live points across all groups (same rule as each card and Performance).
  const totalPoints = Number(groups.reduce((sum, g) => sum + g.points, 0).toFixed(2));

  if (loading && !hasLoadedRef.current) {
    return (
      <Screen>
        <View accessible accessibilityLabel="Loading your groups" style={styles.skeletonList}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </Screen>
    );
  }

  const hasGroups = groups.length > 0;

  return (
    <Screen>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        contentContainerStyle={styles.scroll}
      >
        {user?.firstName ? (
          <Text style={styles.greeting}>Hi, {user.firstName}</Text>
        ) : null}
        {hasGroups ? (
          <View style={styles.titleRow}>
            <Title>Your Groups</Title>
            <View style={styles.pillRow}>
              <Pressable
                onPress={() => router.push("/(main)/create-group")}
                accessibilityRole="button"
                accessibilityLabel="Create group"
                style={({ pressed }) => [styles.pill, styles.pillPrimary, pressed && styles.pressed]}
              >
                <Text style={styles.pillPrimaryText}>+ Create</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/(main)/join-group")}
                accessibilityRole="button"
                accessibilityLabel="Join group"
                style={({ pressed }) => [styles.pill, styles.pillSecondary, pressed && styles.pressed]}
              >
                <Text style={styles.pillSecondaryText}>Join</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Title>Your Groups</Title>
        )}
        {hasGroups ? (
          <Text style={styles.summary}>
            {groups.length} group{groups.length === 1 ? "" : "s"} ·{" "}
            <Text style={pointsStyle(totalPoints)}>{formatLegPoints(totalPoints)}</Text> pts
            total ·{" "}
            <Text
              style={styles.summaryLink}
              accessibilityRole="link"
              onPress={() => router.navigate("/(main)/performance")}
            >
              View performance
            </Text>
          </Text>
        ) : null}
        {groups.length === 0 ? (
          <>
            <Card>
              <Text style={styles.welcomeTitle}>{copy.dashboard.welcomeTitle}</Text>
              <Text style={styles.meta}>{copy.dashboard.welcomeIntro}</Text>
              {copy.dashboard.welcomeSteps.map((step, index) => (
                <Text key={step} style={styles.welcomeStep}>
                  {index + 1}. {step}
                </Text>
              ))}
            </Card>
            <View style={styles.actions}>
              <Button label="Create group" onPress={() => router.push("/(main)/create-group")} />
              <Button
                label="Join group"
                variant="secondary"
                onPress={() => router.push("/(main)/join-group")}
              />
            </View>
          </>
        ) : (
          groups.map((g) => (
            <HomeGroupCard
              key={g.id}
              group={g}
              onOpen={() => router.push(`/(main)/groups/${g.id}`)}
            />
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={[styles.skeletonBar, { width: "55%", height: 16 }]} />
      <View style={[styles.skeletonBar, { width: "35%", height: 10, marginTop: 10 }]} />
      <View style={[styles.skeletonBar, { width: "80%", height: 10, marginTop: 14 }]} />
      <View style={[styles.skeletonBar, { width: "65%", height: 10, marginTop: 8 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 32,
  },
  skeletonList: {
    gap: 12,
  },
  skeletonCard: {
    height: 140,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  skeletonBar: {
    backgroundColor: colors.border,
    borderRadius: 4,
    opacity: 0.6,
  },
  summary: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 12,
  },
  summaryLink: {
    color: colors.accent,
  },
  welcomeTitle: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  welcomeStep: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  greeting: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4,
    marginBottom: 4,
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 2,
  },
  actions: {
    gap: 8,
    marginTop: 20,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  pillPrimary: {
    backgroundColor: colors.accent,
  },
  pillSecondary: {
    backgroundColor: "transparent",
  },
  pillPrimaryText: {
    color: colors.onAccent,
    fontSize: 14,
    fontWeight: "600",
  },
  pillSecondaryText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.75,
  },
});
