import { ApiError } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { LogoMark } from "@/components/logo";
import { Button, ErrorText, Field, LinkText, Screen, Subtitle, Title } from "@/components/ui";
import { colors } from "@/config";
import { redirectAfterAuth } from "@/lib/auth-redirect";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const MIN_SIGN_UP_AGE = 18;

/** Local (not UTC) `YYYY-MM-DD` — matches what an HTML date input submits. */
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplay(d: Date): string {
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // The latest date a signer-up can be born, and a sensible starting point so
  // the picker doesn't open on today's date (an obviously invalid DOB).
  const maxDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - MIN_SIGN_UP_AGE);
    return d;
  }, []);

  function onPickerChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") {
      setShowPicker(false);
      if (event.type === "set" && selected) setDob(selected);
    } else if (selected) {
      setDob(selected);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      await signUp(
        firstName.trim(),
        lastName.trim(),
        email.trim(),
        password,
        dob ? toISODate(dob) : ""
      );
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <LogoMark size={34} />
          <Title>Join Tiki Acca</Title>
        </View>
        <Subtitle>Create your account</Subtitle>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Field placeholder="First name" value={firstName} onChangeText={setFirstName} />
          </View>
          <View style={{ flex: 1 }}>
            <Field placeholder="Last name" value={lastName} onChangeText={setLastName} />
          </View>
        </View>
        <Field
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Pressable
          style={styles.dateField}
          onPress={() => setShowPicker((s) => !s)}
        >
          <Text style={dob ? styles.dateValue : styles.datePlaceholder}>
            {dob ? formatDisplay(dob) : "Date of birth"}
          </Text>
        </Pressable>
        {showPicker ? (
          <DateTimePicker
            value={dob ?? maxDate}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            maximumDate={maxDate}
            themeVariant="dark"
            accentColor={colors.accent}
            onChange={onPickerChange}
          />
        ) : null}

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

const styles = StyleSheet.create({
  dateField: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  dateValue: {
    color: colors.text,
    fontSize: 16,
  },
  datePlaceholder: {
    color: colors.muted,
    fontSize: 16,
  },
});
