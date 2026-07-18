import { ApiError, api } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { Button, Card, ErrorText } from "@/components/ui";
import { colors } from "@/config";
import { useGroupData } from "@/context/group-data";
import {
  DEFAULT_LEGS_PER_MEMBER,
  DEFAULT_MAX_ACTIVE_BETS,
  LEGS_PER_MEMBER_OPTIONS,
  MAX_ACTIVE_BETS_OPTIONS,
  type LegsPerMember,
  type MaxActiveBets,
} from "@tiki-acca/shared";
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
  const [legsPerMember, setLegsPerMember] = useState<LegsPerMember>(
    DEFAULT_LEGS_PER_MEMBER
  );
  const [maxActiveBets, setMaxActiveBets] = useState<MaxActiveBets>(
    DEFAULT_MAX_ACTIVE_BETS
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedNote, setSavedNote] = useState("");

  useEffect(() => {
    if (data?.group.legsPerMember != null) {
      setLegsPerMember(data.group.legsPerMember as LegsPerMember);
    }
  }, [data?.group.legsPerMember]);
  useEffect(() => {
    if (data?.group.maxActiveBets != null) {
      setMaxActiveBets(data.group.maxActiveBets as MaxActiveBets);
    }
  }, [data?.group.maxActiveBets]);

  if (!data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const activeRounds = data.activeRounds ?? (data.activeRound ? [data.activeRound] : []);
  const openRounds = activeRounds.filter((round) => round.status === "open");
  const lockedRounds = activeRounds.filter((round) => round.status === "locked");
  const openRoundsMatchQuota = openRounds.every(
    (round) => round.legsPerMember === legsPerMember
  );

  if (!data.isOwner) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Text style={styles.body}>
            Only the group owner can change settings. This group uses{" "}
            {data.group.legsPerMember} leg
            {data.group.legsPerMember === 1 ? "" : "s"} per member
            , with up to {data.group.maxActiveBets} active bet
            {data.group.maxActiveBets === 1 ? "" : "s"}.
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
        body: JSON.stringify({ legsPerMember, maxActiveBets }),
      });
      setSavedNote(json.note ?? "Saved.");
      await reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const unchanged =
    legsPerMember === data.group.legsPerMember &&
    openRoundsMatchQuota &&
    maxActiveBets === data.group.maxActiveBets;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Group Settings</Text>
      <Text style={styles.meta}>
        Changes apply to open rounds immediately. Locked or in-progress bets keep
        their quota until the next round.
      </Text>
      {lockedRounds.length > 0 ? (
        <Text style={styles.meta}>
          {lockedRounds.length} locked bet
          {lockedRounds.length === 1 ? "" : "s"} will keep their existing quota.
        </Text>
      ) : null}
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
        <Text style={styles.label}>Maximum active bets</Text>
        <Text style={styles.meta}>
          Open and locked unresolved bets count toward this limit. With more
          than one, any member can start a new bet after each open bet has a leg.
        </Text>
        <View style={styles.row}>
          {MAX_ACTIVE_BETS_OPTIONS.map((n) => (
            <Pressable
              key={n}
              onPress={() => setMaxActiveBets(n)}
              style={[
                styles.option,
                maxActiveBets === n && styles.optionActive,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  maxActiveBets === n && styles.optionTextActive,
                ]}
              >
                {n}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.meta}>
          {activeRounds.length} bet{activeRounds.length === 1 ? "" : "s"} currently
          open or locked.
        </Text>
        {maxActiveBets < activeRounds.length ? (
          <Text style={styles.warning}>
            Existing bets will continue. This lower limit will be enforced as
            they conclude, and no new bet can be created until the active count
            falls below {maxActiveBets}.
          </Text>
        ) : null}
        <ErrorText message={error} />
        {savedNote ? <Text style={styles.saved}>{savedNote}</Text> : null}
        {!unchanged ? (
          <Button
            label={saving ? "Saving…" : "Save settings"}
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
  warning: { color: colors.warning, fontSize: 13, marginBottom: 10 },
});
