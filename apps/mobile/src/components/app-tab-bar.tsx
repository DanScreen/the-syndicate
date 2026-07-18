import { colors } from "@/config";
import { router, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Polyline } from "react-native-svg";

type TabIconName = "team" | "performance" | "account";

const PRIMARY_TABS: {
  href: "/(main)/home" | "/(main)/performance" | "/(main)/account";
  match: (pathname: string) => boolean;
  label: string;
  icon: TabIconName;
}[] = [
  {
    href: "/(main)/home",
    label: "Groups",
    icon: "team",
    match: (pathname) =>
      pathname.includes("/home") ||
      pathname.includes("/groups") ||
      pathname.includes("/create-group") ||
      pathname.includes("/join-group") ||
      pathname === "/",
  },
  {
    href: "/(main)/performance",
    label: "Performance",
    icon: "performance",
    match: (pathname) =>
      pathname.includes("/performance") && !pathname.includes("/groups"),
  },
  {
    href: "/(main)/account",
    label: "Account",
    icon: "account",
    match: (pathname) => pathname.includes("/account"),
  },
];

function TabIcon({ name, active }: { name: TabIconName; active: boolean }) {
  const color = active ? colors.accent : colors.muted;

  if (name === "team") {
    // People glyph — matches the marketing icon set (page.tsx "users" icon).
    return (
      <Svg width={23} height={23} viewBox="0 0 24 24" fill="none">
        <Path
          d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
          stroke={color}
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  if (name === "performance") {
    return (
      <Svg width={23} height={23} viewBox="0 0 24 24" fill="none">
        <Path
          d="M4 3v17h17"
          stroke={color}
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Polyline
          points="7,16 11,11 14,14 20,6"
          stroke={color}
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    );
  }

  return (
    <Svg width={23} height={23} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={3.5} stroke={color} strokeWidth={1.7} />
      <Path
        d="M5 21c.7-4.2 3-6.3 7-6.3s6.3 2.1 7 6.3"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function AppTabBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {PRIMARY_TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Pressable
            key={tab.href}
            onPress={() => {
              if (active && tab.href === "/(main)/home" && pathname.includes("/groups/")) {
                router.navigate("/(main)/home");
                return;
              }
              if (active) return;
              router.navigate(tab.href);
            }}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <TabIcon name={tab.icon} active={active} />
            <Text style={[styles.label, active && styles.activeText]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    gap: 2,
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600",
  },
  activeText: {
    color: colors.accent,
  },
});
