import { ApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { Logo } from "@/components/logo";
import { Button, ErrorText, Field } from "@/components/ui";
import { colors } from "@/config";
import { redirectAfterAuth } from "@/lib/auth-redirect";
import {
  BRAND_HEADLINE,
  BRAND_MOBILE_SUBHEAD,
  BRAND_TAGLINE,
} from "@tiki-acca/shared";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SignInScreen() {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
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
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View
        style={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <View style={styles.hero}>
          <Logo markSize={44} />
          <Text style={styles.eyebrow}>{BRAND_TAGLINE}</Text>
          <Text style={styles.headline}>{BRAND_HEADLINE}</Text>
          <Text style={styles.subhead}>{BRAND_MOBILE_SUBHEAD}</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Welcome</Text>
          <Field
            placeholder="Email"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
          />
          <Field
            placeholder="Password"
            secureTextEntry
            textContentType="password"
            value={password}
            onChangeText={setPassword}
          />
          <View style={styles.errorSlot}>
            <ErrorText message={error} />
          </View>
          <Button label="Sign in" onPress={handleSubmit} loading={loading} />
          <Pressable onPress={() => router.push("/sign-up")} style={styles.createLink}>
            <Text style={styles.createText}>
              New here? <Text style={styles.createAccent}>Create an account</Text>
            </Text>
          </Pressable>
        </View>

        <Text style={styles.disclosure}>
          Free to play · Not a bookmaker · 18+
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "space-between",
    gap: 14,
  },
  hero: {
    alignItems: "flex-start",
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 14,
  },
  headline: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800",
    letterSpacing: -0.7,
    marginTop: 8,
    maxWidth: 350,
  },
  subhead: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 350,
  },
  formCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  formTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "700",
    marginBottom: 12,
  },
  errorSlot: {
    minHeight: 18,
  },
  createLink: {
    alignItems: "center",
    paddingTop: 14,
    paddingBottom: 2,
  },
  createText: {
    color: colors.muted,
    fontSize: 14,
  },
  createAccent: {
    color: colors.accent,
    fontWeight: "600",
  },
  disclosure: {
    color: colors.muted,
    fontSize: 11,
    textAlign: "center",
  },
});
