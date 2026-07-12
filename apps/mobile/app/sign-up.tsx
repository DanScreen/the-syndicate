import { ApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { Button, ErrorText, Field, LinkText, Screen, Subtitle, Title } from "@/components/ui";
import { redirectAfterAuth } from "@/lib/auth-redirect";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      await signUp(name.trim(), email.trim(), password);
      redirectAfterAuth();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen>
        <Title>Join the Syndicate</Title>
        <Subtitle>Create your account</Subtitle>
        <Field placeholder="Name" value={name} onChangeText={setName} />
        <Field
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Field
          placeholder="Password (min 8 chars)"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <ErrorText message={error} />
        <Button label="Sign up" onPress={handleSubmit} loading={loading} />
        <LinkText label="Already have an account?" onPress={() => router.back()} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
