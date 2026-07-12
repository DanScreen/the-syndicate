import { ApiError, api } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { GambleResponsiblyFooter } from "@/components/compliance";
import { Button, ErrorText, Field, Screen, Subtitle, Title } from "@/components/ui";
import { copy } from "@/lib/copy";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

export default function JoinGroupScreen() {
  const { token } = useAuth();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (code) setInviteCode(code.toUpperCase());
  }, [code]);

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
      <Title>{copy.join.title}</Title>
      <Subtitle>{copy.join.subtitle}</Subtitle>
      <Field
        placeholder={copy.join.placeholder}
        autoCapitalize="characters"
        value={inviteCode}
        onChangeText={(text) => setInviteCode(text.toUpperCase())}
      />
      <ErrorText message={error} />
      <Button label="Join group" onPress={handleSubmit} loading={loading} />
      <GambleResponsiblyFooter />
    </Screen>
  );
}
