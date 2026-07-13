import { ApiError, api } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { Button, Card, ErrorText } from "@/components/ui";
import { colors } from "@/config";
import { copy } from "@/lib/copy";
import type { NotificationPreferences } from "@the-syndicate/shared";
import { registerForPushNotifications } from "@/notifications/register";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

type PrefKey = keyof NotificationPreferences;

const SECTIONS: {
  title: string;
  items: { key: PrefKey; label: string; hint: string }[];
}[] = [
  {
    title: "Email",
    items: [
      {
        key: "emailPickReminder",
        label: "Pick reminders",
        hint: "Before the acca locks at kickoff",
      },
      {
        key: "emailRoundLocked",
        label: "Acca locked",
        hint: "When your syndicate acca is ready",
      },
      {
        key: "emailRoundSettled",
        label: "Round settled",
        hint: "When results are in",
      },
    ],
  },
  {
    title: "Push",
    items: [
      {
        key: "pushPickReminder",
        label: "Pick reminders",
        hint: "Last-minute nudges on your phone",
      },
      {
        key: "pushRoundLocked",
        label: "Acca locked",
        hint: "When the acca locks",
      },
      {
        key: "pushRoundSettled",
        label: "Round settled",
        hint: "When results are in",
      },
    ],
  },
];

export default function NotificationsScreen() {
  const { token } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await api<NotificationPreferences>(
        "/api/user/notification-preferences",
        { token }
      );
      setPrefs(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : copy.stats.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function update(key: PrefKey, value: boolean) {
    if (!token || !prefs) return;
    const prev = prefs;
    setPrefs({ ...prefs, [key]: value });
    try {
      const data = await api<NotificationPreferences>(
        "/api/user/notification-preferences",
        {
          method: "PATCH",
          token,
          body: JSON.stringify({ [key]: value }),
        }
      );
      setPrefs(data);
    } catch {
      setPrefs(prev);
      setError("Could not save preferences.");
    }
  }

  async function enablePush() {
    if (!token) return;
    setPushStatus(null);
    const result = await registerForPushNotifications(token);
    setPushStatus(result ? "Push enabled on this device." : "Permission denied or unavailable.");
  }

  if (loading) {
    return <ActivityIndicator color={colors.accent} style={styles.centered} />;
  }

  if (error && !prefs) {
    return <ErrorText message={error} />;
  }

  if (!prefs) {
    return null;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.intro}>
        Get reminded to pick before kickoff, and when accas lock or settle.
      </Text>

      <Card>
        <Text style={styles.cardTitle}>This device</Text>
        <Text style={styles.hint}>
          Enable push so reminders reach your phone. Requires a physical device
          (not iOS Simulator).
        </Text>
        <Button label="Enable push on this device" onPress={enablePush} />
        {pushStatus ? <Text style={styles.hint}>{pushStatus}</Text> : null}
      </Card>

      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.items.map((item) => (
            <View key={item.key} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={styles.hint}>{item.hint}</Text>
              </View>
              <Switch
                value={prefs[item.key]}
                onValueChange={(v) => update(item.key, v)}
                trackColor={{ true: colors.accent, false: colors.border }}
              />
            </View>
          ))}
        </View>
      ))}
      {error ? <ErrorText message={error} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 20,
  },
  centered: {
    marginTop: 32,
  },
  intro: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 8,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
});
