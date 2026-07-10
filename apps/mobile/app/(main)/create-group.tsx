import { ApiError, api } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { Button, ErrorText, Field, Screen, Subtitle, Title } from "@/components/ui";
import { router } from "expo-router";
import { useState } from "react";

export default function CreateGroupScreen() {
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ group: { id: string } }>("/api/groups", {
        method: "POST",
        token,
        body: JSON.stringify({ name: name.trim() }),
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
      <ErrorText message={error} />
      <Button label="Create" onPress={handleSubmit} loading={loading} />
    </Screen>
  );
}
