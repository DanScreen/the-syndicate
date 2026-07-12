import { ApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { Button, ErrorText, Field, LinkText, Screen, Subtitle, Title } from "@/components/ui";
import { redirectAfterAuth } from "@/lib/auth-redirect";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      await signIn(email.trim(), password);
      redirectAfterAuth();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Sign in failed");
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
        <Title>The Syndicate</Title>
        <Subtitle>Sign in to your account</Subtitle>
        <Field
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Field
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <ErrorText message={error} />
        <Button label="Sign in" onPress={handleSubmit} loading={loading} />
        <LinkText label="Create an account" onPress={() => router.push("/sign-up")} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
