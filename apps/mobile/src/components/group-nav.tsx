import { colors } from "@/config";
import { useGroupData } from "@/context/group-data";
import { router, useLocalSearchParams, useSegments } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

const BASE_TABS = [
  { segment: "index", label: "Round" },
  { segment: "history", label: "History" },
  { segment: "leaderboard", label: "Leaderboard" },
  { segment: "performance", label: "Performance" },
] as const;

export function GroupNav() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const segments = useSegments() as string[];
  const activeSegment = segments[3] ?? "index";
  const { data } = useGroupData();
  const tabs = data?.isOwner
    ? [...BASE_TABS, { segment: "settings", label: "Settings" }]
    : [...BASE_TABS];

  function go(segment: string) {
    const base = `/(main)/groups/${id}` as const;
    if (segment === "index") {
      router.replace(base);
    } else {
      router.replace(`${base}/${segment}` as `/(main)/groups/${string}/${string}`);
    }
  }

  return (
    <View style={styles.nav}>
      {tabs.map((tab) => {
        const active = activeSegment === tab.segment;
        return (
          <Pressable
            key={tab.segment}
            onPress={() => go(tab.segment)}
            style={[styles.tab, active && styles.tabActive]}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginTop: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: colors.accent,
  },
  tabText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "500",
  },
  tabTextActive: {
    color: colors.accent,
    fontWeight: "600",
  },
});
