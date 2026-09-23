import { ApiError, api } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { Button, ErrorText, Field, LinkText, Screen, Subtitle, Title } from "@/components/ui";
import { colors } from "@/config";
import { checkEmailFormat } from "@tiki-acca/shared";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AppState, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";

// Once verified the root guard swaps this screen for (main), whose layout
// picks up any pending invite — so don't consume it here.
function enterApp() {
  router.replace("/(main)/home");
}

/**
 * Signed in but email unconfirmed. The emailed link opens on the web
 * `/verify-email` page, so this screen re-checks status on focus/tap.
 */
export default function VerifyEmailScreen() {
  const { user, token, signOut, refreshEmailVerification, setUnverifiedEmail } = useAuth();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"check" | "resend" | "change" | null>(null);
  const [changing, setChanging] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");

  // Accounts from before verification existed have never been sent a link.
  const ensured = useRef(false);
  useEffect(() => {
    if (!token || ensured.current) return;
    ensured.current = true;
    void api("/api/auth/verify-email/resend", {
      method: "POST",
      token,
      body: JSON.stringify({ onlyIfNonePending: true }),
    }).catch(() => {});
  }, [token]);

  // Coming back from the mail app / browser after tapping the link.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      void refreshEmailVerification()
        .then((verified) => {
          if (verified) enterApp();
        })
        .catch(() => {});
    });
    return () => sub.remove();
  }, [refreshEmailVerification]);

  async function checkAgain() {
    setBusy("check");
    setError("");
    setNotice("");
    try {
      if (await refreshEmailVerification()) {
        enterApp();
        return;
      }
      setError("Not confirmed yet — tap the link in the email we sent you.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't check — try again");
    } finally {
      setBusy(null);
    }
  }

  async function resend() {
    setBusy("resend");
    setError("");
    setNotice("");
    try {
      const data = await api<{ alreadyVerified?: boolean }>("/api/auth/verify-email/resend", {
        method: "POST",
        token,
      });
      if (data.alreadyVerified) {
        await refreshEmailVerification();
        enterApp();
        return;
      }
      setNotice("Sent — check your inbox (and spam folder).");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't send the email");
    } finally {
      setBusy(null);
    }
  }

  async function changeEmail() {
    const check = checkEmailFormat(newEmail);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    setBusy("change");
    setError("");
    setNotice("");
    try {
      const data = await api<{ email: string }>("/api/auth/verify-email/change-email", {
        method: "POST",
        token,
        body: JSON.stringify({ email: newEmail.trim(), password }),
      });
      await setUnverifiedEmail(data.email);
      setChanging(false);
      setNewEmail("");
      setPassword("");
      setNotice(`Updated — we've sent a new link to ${data.email}.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't update your email");
    } finally {
      setBusy(null);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen>
        <Title>Confirm your email</Title>
        <Subtitle>One quick step before you get started</Subtitle>
        <Text style={styles.body}>
          We&apos;ve sent a confirmation link to{" "}
          <Text style={styles.email}>{user?.email ?? "your email"}</Text>. Tap it (on this phone
          or any computer), then come back here. The link expires after 24 hours.
        </Text>

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        <ErrorText message={error} />

        {changing ? (
          <View style={styles.section}>
            <Field
              placeholder="Correct email"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              value={newEmail}
              onChangeText={setNewEmail}
            />
            <Field
              placeholder="Password"
              secureTextEntry
              textContentType="password"
              value={password}
              onChangeText={setPassword}
            />
            <Button
              label="Update and resend"
              onPress={changeEmail}
              loading={busy === "change"}
            />
            <LinkText label="Cancel" onPress={() => setChanging(false)} />
          </View>
        ) : (
          <View style={styles.section}>
            <Button label="I've confirmed it" onPress={checkAgain} loading={busy === "check"} />
            <Button
              label="Resend email"
              variant="secondary"
              onPress={resend}
              loading={busy === "resend"}
            />
            <LinkText label="Wrong email address?" onPress={() => setChanging(true)} />
          </View>
        )}

        <LinkText label="Sign out" onPress={() => void signOut()} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 20,
  },
  email: {
    fontWeight: "600",
  },
  notice: {
    color: colors.accent,
    fontSize: 14,
    marginBottom: 12,
  },
  section: {
    gap: 12,
    marginBottom: 12,
  },
});
