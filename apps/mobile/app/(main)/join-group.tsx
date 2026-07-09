import { ApiError, api } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { Button, ErrorText, Field, Screen, Subtitle, Title } from "@/components/ui";
import { router } from "expo-router";
import { useState } from "react";

export default function JoinGroupScreen() {
  const { token } = useAuth();
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ groupId: string }>("/api/groups/join", {
        method: "POST",
        token,
        body: JSON.stringify({ inviteCode: inviteCode.trim().toUpperCase() }),
      });
      router.replace(`/(main)/groups/${data.groupId}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to join group");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Title>Join group</Title>
      <Subtitle>Enter the invite code from your squad</Subtitle>
      <Field
        placeholder="Invite code"
        autoCapitalize="characters"
        value={inviteCode}
        onChangeText={setInviteCode}
      />
      <ErrorText message={error} />
      <Button label="Join" onPress={handleSubmit} loading={loading} />
    </Screen>
  );
}
