import { colors, WEB_URL } from "@/config";
import { useGroupData } from "@tiki-acca/client";
import { copy } from "@tiki-acca/shared";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";

function inviteUrl(inviteCode: string) {
  return `${WEB_URL}/groups/join?code=${encodeURIComponent(inviteCode)}`;
}

async function shareInvite(groupName: string, url: string) {
  try {
    await Share.share({ message: copy.invite.shareMessage(groupName, url), url });
  } catch {
    // Dismissed or unavailable — nothing to do.
  }
}

export default function GroupInviteScreen() {
  const { data } = useGroupData();

  if (!data) return null;

  const url = inviteUrl(data.group.inviteCode);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{copy.invite.title}</Text>
      <Text style={styles.subtitle}>{copy.invite.subtitle}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>{copy.invite.codeLabel}</Text>
        <Text selectable style={styles.code}>
          {data.group.inviteCode}
        </Text>
        <Text style={[styles.label, styles.linkLabel]}>{copy.invite.linkLabel}</Text>
        <Text selectable style={styles.link}>
          {url}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void shareInvite(data.group.name, url)}
          style={({ pressed }) => [styles.shareButton, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.shareLabel}>{copy.invite.share}</Text>
        </Pressable>
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
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
  },
  linkLabel: {
    marginTop: 12,
  },
  code: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: "600",
    letterSpacing: 4,
    marginTop: 4,
  },
  link: {
    color: colors.text,
    fontSize: 12,
    marginTop: 4,
  },
  shareButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  shareLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
});
