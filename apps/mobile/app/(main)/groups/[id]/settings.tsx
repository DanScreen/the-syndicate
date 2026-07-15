import { ApiError, api } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { Button, Card, ErrorText } from "@/components/ui";
import { colors } from "@/config";
import { useGroupData } from "@/context/group-data";
import { LEGS_PER_MEMBER_OPTIONS, DEFAULT_LEGS_PER_MEMBER, type LegsPerMember } from "@tiki-acca/shared";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function GroupSettingsScreen() {
  const { token } = useAuth();
  const { data, reload } = useGroupData();
  const [legsPerMember, setLegsPerMember] = useState<LegsPerMember>(DEFAULT_LEGS_PER_MEMBER);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedNote, setSavedNote] = useState("");

  useEffect(() => {
    if (data?.group.legsPerMember) {
      setLegsPerMember(data.group.legsPerMember as LegsPerMember);
    }
  }, [data?.group.legsPerMember]);

  if (!data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!data.isOwner) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text style={styles.body}>
            Only the group owner can change settings. This group uses{" "}
            {data.group.legsPerMember} leg
            {data.group.legsPerMember === 1 ? "" : "s"} per member on new rounds.
          </Text>
        </Card>
      </ScrollView>
    );
  }

  async function handleSave() {
    if (!data || !token) return;
    setSaving(true);
    setError("");
    setSavedNote("");
    try {
      const json = await api<{ note?: string }>(`/api/groups/${data.group.id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ legsPerMember }),
      });
      setSavedNote(
        json.note ??
          "Saved. Legs per member applies to the next open round."
      );
      await reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Group settings</Text>
      <Text style={styles.meta}>
        Changes apply to future rounds after the current acca settles
        {data.activeRound
          ? ` — this round stays at ${data.activeRound.legsPerMember}`
          : ""}
        .
      </Text>
      <Card>
        <Text style={styles.label}>Legs per member</Text>
        <View style={styles.row}>
          {LEGS_PER_MEMBER_OPTIONS.map((n) => (
            <Pressable
              key={n}
              onPress={() => setLegsPerMember(n)}
              style={[styles.option, legsPerMember === n && styles.optionActive]}
            >
              <Text
                style={[
                  styles.optionText,
                  legsPerMember === n && styles.optionTextActive,
                ]}
              >
                {n}
              </Text>
            </Pressable>
          ))}
        </View>
        <ErrorText message={error} />
        {savedNote ? <Text style={styles.saved}>{savedNote}</Text> : null}
        {legsPerMember !== data.group.legsPerMember ? (
          <Button
            label={saving ? "Saving..." : "Save settings"}
            onPress={handleSave}
            loading={saving}
          />
        ) : (
          <Text style={styles.meta}>Current setting already saved.</Text>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 20, fontWeight: "600" },
  meta: { color: colors.muted, fontSize: 13, marginBottom: 8 },
  body: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  label: { color: colors.text, fontWeight: "600", marginBottom: 10 },
  row: { flexDirection: "row", gap: 8, marginBottom: 16 },
  option: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  optionActive: {
    borderColor: colors.accent,
    backgroundColor: "rgba(20, 83, 45, 0.4)",
  },
  optionText: { color: colors.muted, fontWeight: "600" },
  optionTextActive: { color: colors.accent },
  saved: { color: colors.accent, fontSize: 13, marginBottom: 10 },
});
