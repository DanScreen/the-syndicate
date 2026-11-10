import { colors } from "@/config";
import { useGroupData } from "@tiki-acca/client";
import { router, useLocalSearchParams, useSegments } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

// Invite and settings live in the group header; this bar is only the three group views.
const TABS = [
  { segment: "index", label: "Bet" },
  { segment: "leaderboard", label: "Leaderboard" },
  { segment: "chat", label: "Chat" },
] as const;

export function GroupNav() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const segments = useSegments() as string[];
  const activeSegment = segments[3] ?? "index";
  const { data } = useGroupData();
  const unread = data?.group.unreadMessageCount ?? 0;

  function go(segment: string) {
    const base = `/(main)/groups/${id}` as const;
    if (segment === "index") {
      router.replace(base);
    } else {
      router.replace(`${base}/${segment}` as `/(main)/groups/${string}/${string}`);
    }
  }

  return (
    // Tabs share the row so every one fits without scrolling.
    <View style={styles.nav}>
      {TABS.map((tab) => {
        const active = activeSegment === tab.segment;
        const showUnread = tab.segment === "chat" && unread > 0;
        return (
          <Pressable
            key={tab.segment}
            onPress={() => go(tab.segment)}
            style={[styles.tab, active && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={
              showUnread ? `${tab.label}, ${unread} unread` : tab.label
            }
          >
            <View style={styles.labelRow}>
              <Text
                numberOfLines={1}
                style={[styles.tabText, active && styles.tabTextActive]}
              >
                {tab.label}
              </Text>
              {showUnread ? (
                <Text style={styles.unreadBadge}>{unread > 9 ? "9+" : unread}</Text>
              ) : null}
            </View>
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
    marginTop: 8,
  },
  tab: {
    flexGrow: 1,
    flexShrink: 1,
    paddingHorizontal: 4,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: colors.accent,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tabText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "500",
  },
  tabTextActive: {
    color: colors.accent,
    fontWeight: "600",
  },
  unreadBadge: {
    color: colors.onAccent,
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
    fontSize: 11,
    fontWeight: "600",
    overflow: "hidden",
  },
});
