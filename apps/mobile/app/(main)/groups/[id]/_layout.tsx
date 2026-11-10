import { useApiFetcher } from "@/api/use-api-fetcher";
import { GroupNav } from "@/components/group-nav";
import { ErrorText } from "@/components/ui";
import { colors } from "@/config";
import {
  copy,
  formatRoundStatusBadge,
} from "@tiki-acca/shared";
import { GroupDataProvider, useGroupData } from "@tiki-acca/client";
import {
  router,
  Slot,
  useFocusEffect,
  useLocalSearchParams,
  useSegments,
} from "expo-router";
import { useCallback, useRef } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function goBackToGroups() {
  router.navigate("/(main)/home");
}

function GroupLayoutInner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useGroupData();
  // The provider loads on mount; coming back to the group (e.g. from Account
  // after a new profile picture) reloads, so changes show without reopening it.
  const focusedBefore = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedBefore.current) void reload();
      focusedBefore.current = true;
    }, [reload])
  );
  const insets = useSafeAreaInsets();
  const segments = useSegments() as string[];
  // The brand header is hidden inside groups, so this layout owns the top inset.
  const paddingTop = Math.max(insets.top, 8);
  const activeSegment = segments[3] ?? "index";

  if (loading || !data) {
    return (
      <View style={[styles.container, { paddingHorizontal: 16, paddingTop }]}>
        <Pressable
          onPress={goBackToGroups}
          style={styles.backLink}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back to groups"
        >
          <Text style={styles.backLinkLabel}>← Groups</Text>
        </Pressable>
        <View style={styles.centeredBody}>
          {loading ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <ErrorText message={error || copy.group.notFound} />
          )}
        </View>
      </View>
    );
  }

  function goToRoute(segment: "invite" | "settings") {
    router.replace(
      `/(main)/groups/${id}/${segment}` as `/(main)/groups/${string}/${string}`
    );
  }

  const inviteActive = activeSegment === "invite";
  const settingsActive = activeSegment === "settings";

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop }]}>
        <Pressable
          onPress={goBackToGroups}
          style={styles.backButton}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel="Back to groups"
        >
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>

        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>
            {data.group.name}
          </Text>
          <Text style={styles.subtitle}>
            {data.group.memberCount} members ·{" "}
            <Text style={styles.status}>
              {formatRoundStatusBadge(data.activeRound?.status ?? data.group.status)}
            </Text>
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => goToRoute("invite")}
            style={[styles.pill, inviteActive && styles.pillActive]}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="Invite"
          >
            <Text style={styles.pillText}>Invite</Text>
          </Pressable>
          {data.isOwner ? (
            <Pressable
              onPress={() => goToRoute("settings")}
              style={[styles.iconButton, settingsActive && styles.pillActive]}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel="Group settings"
            >
              <Text style={styles.iconGlyph}>⋯</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <GroupNav />
      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}

export default function GroupLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const fetcher = useApiFetcher();

  if (!id) return null;

  return (
    <GroupDataProvider groupId={id} fetcher={fetcher}>
      <GroupLayoutInner />
    </GroupDataProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingBottom: 4,
    backgroundColor: colors.bg,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -12,
    flexShrink: 0,
  },
  backGlyph: {
    color: colors.accent,
    fontSize: 32,
    lineHeight: 34,
    fontWeight: "400",
  },
  backLink: {
    alignSelf: "flex-start",
    marginBottom: 8,
    paddingVertical: 4,
  },
  backLinkLabel: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "500",
  },
  centeredBody: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  status: {
    color: colors.accent,
  },
  pill: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillActive: {
    backgroundColor: colors.accentMuted,
  },
  pillText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "700",
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  iconGlyph: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 18,
  },
});
