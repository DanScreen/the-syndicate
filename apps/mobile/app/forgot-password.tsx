import { ApiError, api } from "@/api/client";
import { Button, ErrorText, Field, LinkText, Screen, Subtitle, Title } from "@/components/ui";
import { colors } from "@/config";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      await api("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setSent(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Title>Reset your password</Title>
      {sent ? (
        <Text style={styles.sent}>
          If that email is registered, we&apos;ve sent a password reset link. Open it on your
          phone or computer to set a new password.
        </Text>
      ) : (
        <>
          <Subtitle>Enter your email and we&apos;ll send you a reset link</Subtitle>
          <Field
            placeholder="Email"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
          />
          <ErrorText message={error} />
          <Button label="Send reset link" onPress={handleSubmit} loading={loading} />
        </>
      )}
      <LinkText label="Back to sign in" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sent: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 20,
  },
});
