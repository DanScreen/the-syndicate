import { GroupNav } from "@/components/group-nav";
import { ErrorText } from "@/components/ui";
import { colors } from "@/config";
import { copy } from "@/lib/copy";
import { formatRoundStatusBadge } from "@tiki-acca/shared";
import { GroupDataProvider, useGroupData } from "@/context/group-data";
import { router, Slot, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function goBackToGroups() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace("/(main)");
  }
}

function GroupLayoutInner() {
  const { data, loading, error } = useGroupData();
  const insets = useSafeAreaInsets();

  if (loading || !data) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 8, paddingHorizontal: 20 }]}>
        <Pressable onPress={goBackToGroups} style={styles.backButton} hitSlop={8}>
          <Text style={styles.backLabel}>← Groups</Text>
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

  return (
    <View style={styles.container}>
      <View style={[styles.shell, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={goBackToGroups} style={styles.backButton} hitSlop={8}>
          <Text style={styles.backLabel}>← Groups</Text>
        </Pressable>
        <Text style={styles.title}>{data.group.name}</Text>
        <Text style={styles.subtitle}>
          {data.group.memberCount} members ·{" "}
          <Text style={styles.status}>
            {formatRoundStatusBadge(data.activeRound?.status ?? data.group.status)}
          </Text>
        </Text>
        <View style={styles.inviteCard}>
          <Text style={styles.inviteLabel}>Invite code</Text>
          <Text style={styles.inviteCode}>{data.group.inviteCode}</Text>
        </View>
        <GroupNav />
      </View>
      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}

export default function GroupLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) return null;

  return (
    <GroupDataProvider groupId={id}>
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
  shell: {
    paddingHorizontal: 20,
    backgroundColor: colors.bg,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 8,
    paddingVertical: 4,
  },
  backLabel: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: "500",
  },
  centeredBody: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4,
  },
  status: {
    color: colors.accent,
  },
  inviteCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
  },
  inviteLabel: {
    color: colors.muted,
    fontSize: 13,
  },
  inviteCode: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: 4,
    marginTop: 4,
  },
});
