import { useAuth } from "@/auth/AuthProvider";
import { GroupStatsPanel } from "@/components/stats";
import { colors } from "@/config";
import { useGroupData } from "@/context/group-data";
import { ScrollView, StyleSheet, Text } from "react-native";

export default function GroupPerformanceScreen() {
  const { token } = useAuth();
  const { data } = useGroupData();

  if (!data || !token) return null;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Group Performance</Text>
      <Text style={styles.subtitle}>Stats, trends, and member breakdowns.</Text>
      <GroupStatsPanel groupId={data.group.id} token={token} />
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
