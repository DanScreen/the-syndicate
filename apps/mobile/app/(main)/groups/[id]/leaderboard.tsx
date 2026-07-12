import { Leaderboard } from "@/components/group-round";
import { colors } from "@/config";
import { useGroupData } from "@/context/group-data";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function GroupLeaderboardScreen() {
  const { data } = useGroupData();

  if (!data) return null;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Leaderboard</Text>
      <Text style={styles.subtitle}>Points from settled legs in this group.</Text>
      <Leaderboard entries={data.leaderboard} />
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
