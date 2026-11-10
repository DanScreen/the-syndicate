import { useAuth } from "@/auth/AuthProvider";
import { Leaderboard } from "@/components/round/leaderboard";
import { GroupStatsPanel } from "@/components/stats";
import { colors } from "@/config";
import { useGroupData } from "@tiki-acca/client";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function GroupLeaderboardScreen() {
  const { token, user } = useAuth();
  const { data } = useGroupData();

  if (!data || !token) return null;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Leaderboard</Text>
      <Text style={styles.subtitle}>
        Points from settled and in-play legs.
      </Text>
      <Leaderboard entries={data.leaderboard} currentUserId={user?.id} />

      <View style={styles.section}>
        <Text style={styles.title}>Stats & trends</Text>
        <Text style={styles.subtitle}>
          Group charts, stake converter, and member breakdowns.
        </Text>
        <GroupStatsPanel groupId={data.group.id} groupName={data.group.name} token={token} />
      </View>
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
    paddingBottom: 40,
    gap: 12,
  },
  section: {
    marginTop: 24,
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
  },
});
