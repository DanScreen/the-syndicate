import { ApiError, api } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { Button, Card, ErrorText, Title } from "@/components/ui";
import { colors, WEB_URL } from "@/config";
import { copy } from "@/lib/copy";
import type { NotificationPreferences } from "@tiki-acca/shared";
import { registerForPushNotifications } from "@/notifications/register";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Linking,
  Pressable,
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
        hint: "When your group acca is ready",
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
      {
        key: "pushChat",
        label: "Group chat",
        hint: "Batched alerts for new group chat",
      },
    ],
  },
];

let cachedPrefs: { token: string; data: NotificationPreferences } | null = null;

function NotificationsSkeleton() {
  return (
    <View style={styles.notificationsBlock}>
      <View style={[styles.skeletonCard, { height: 128 }]} />
      <Text style={styles.sectionTitle}>Email</Text>
      <View style={styles.skeletonRow} />
      <View style={styles.skeletonRow} />
      <View style={styles.skeletonRow} />
      <Text style={styles.sectionTitle}>Push</Text>
      <View style={styles.skeletonRow} />
      <View style={styles.skeletonRow} />
      <View style={styles.skeletonRow} />
      <View style={styles.skeletonRow} />
    </View>
  );
}

export default function AccountScreen() {
  const { token, user, signOut } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(() =>
    token && cachedPrefs?.token === token ? cachedPrefs.data : null
  );
  const [loading, setLoading] = useState(!prefs);
  const [error, setError] = useState("");
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError("");
    try {
      const data = await api<NotificationPreferences>(
        "/api/user/notification-preferences",
        { token }
      );
      cachedPrefs = { token, data };
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
      cachedPrefs = { token, data };
      setPrefs(data);
    } catch {
      setPrefs(prev);
      setError("Could not save preferences.");
    }
  }

  async function enablePush() {
    if (!token) return;
    setPushStatus(null);
    try {
      const result = await registerForPushNotifications(token);
      setPushStatus(
        result ? "Push enabled on this device." : "Permission denied or unavailable."
      );
    } catch (e) {
      setPushStatus(
        e instanceof Error ? e.message : "Could not enable push on this device."
      );
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Title>Account</Title>
      <Card>
        <Text style={styles.cardTitle}>Profile</Text>
        <Text style={styles.profileName}>
          {user?.name ?? user?.firstName ?? "Member"}
        </Text>
        {user?.email ? <Text style={styles.hint}>{user.email}</Text> : null}
      </Card>

      <Text style={styles.sectionHeading}>Notifications</Text>
      <Text style={styles.intro}>
        Get reminded to pick before kickoff, and when accas lock or settle.
      </Text>

      {loading && !prefs ? (
        <NotificationsSkeleton />
      ) : error && !prefs ? (
        <ErrorText message={error} />
      ) : prefs ? (
        <View style={styles.notificationsBlock}>
          <Card>
            <Text style={styles.cardTitle}>This device</Text>
            <Text style={styles.hint}>
              Enable push so reminders reach your phone. Requires a physical
              device (not iOS Simulator).
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
        </View>
      ) : null}

      <Card>
        <Text style={styles.cardTitle}>Legal</Text>
        <Text style={styles.hint}>
          We only use essential cookies to keep you signed in, and never sell your
          data.
        </Text>
        <Pressable onPress={() => Linking.openURL(`${WEB_URL}/privacy`)}>
          <Text style={styles.link}>Privacy Notice</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(`${WEB_URL}/cookies`)}>
          <Text style={styles.link}>Cookie Notice</Text>
        </Pressable>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Session</Text>
        <Text style={styles.hint}>Sign out on this device.</Text>
        <Button
          label="Sign out"
          variant="secondary"
          onPress={() => signOut().then(() => router.replace("/sign-in"))}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  notificationsBlock: {
    gap: 16,
  },
  skeletonCard: {
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skeletonRow: {
    height: 72,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeading: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
    marginTop: 8,
  },
  intro: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: -8,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  profileName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "600",
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
  link: {
    color: colors.accent,
    fontSize: 14,
    paddingVertical: 6,
  },
});
