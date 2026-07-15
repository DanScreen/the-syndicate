import { ApiError, api } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { Button, ErrorText, Field, Screen, Subtitle, Title } from "@/components/ui";
import { colors } from "@/config";
import { LEGS_PER_MEMBER_OPTIONS, DEFAULT_LEGS_PER_MEMBER, type LegsPerMember } from "@tiki-acca/shared";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function CreateGroupScreen() {
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [legsPerMember, setLegsPerMember] = useState<LegsPerMember>(DEFAULT_LEGS_PER_MEMBER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ group: { id: string } }>("/api/groups", {
        method: "POST",
        token,
        body: JSON.stringify({ name: name.trim(), legsPerMember }),
      });
      router.replace(`/(main)/groups/${data.group.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to create group");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Title>Create group</Title>
      <Subtitle>Start a new acca squad</Subtitle>
      <Field placeholder="Group name" value={name} onChangeText={setName} />
      <Text style={styles.label}>Legs per member</Text>
      <Text style={styles.hint}>Everyone submits the same number each round.</Text>
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
      <Button label="Create" onPress={handleSubmit} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.muted, fontSize: 13, marginTop: 16 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 4, marginBottom: 10 },
  row: { flexDirection: "row", gap: 8, marginBottom: 16 },
  option: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
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
});
