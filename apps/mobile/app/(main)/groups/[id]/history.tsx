import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { RoundHistory } from "@/components/group-round";
import { colors } from "@/config";
import { useGroupData } from "@/context/group-data";
import type { GroupHistoryResponse, HistoryRound } from "@tiki-acca/shared";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function GroupHistoryScreen() {
  const { token } = useAuth();
  const { data } = useGroupData();
  const [rounds, setRounds] = useState<HistoryRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token || !data?.group.id) return;
    const res = await api<GroupHistoryResponse>(
      `/api/groups/${data.group.id}/history`,
      { token }
    );
    setRounds(res.rounds);
  }, [token, data?.group.id]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setRounds([]))
      .finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
        />
      }
    >
      <Text style={styles.title}>Bet history</Text>
      <Text style={styles.subtitle}>
        Every settled acca — fixtures, markets, and outcomes.
      </Text>
      {rounds.length === 0 ? (
        <Text style={styles.empty}>
          No settled bets yet. History appears after your first round is settled.
        </Text>
      ) : (
        <RoundHistory rounds={rounds} title="All settled bets" />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 20,
    gap: 12,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 4,
  },
  empty: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 12,
  },
});
