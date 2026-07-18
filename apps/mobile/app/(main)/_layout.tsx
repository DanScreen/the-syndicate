import { useAuth } from "@/auth/AuthProvider";
import { AppHeader } from "@/components/app-header";
import { AppTabBar } from "@/components/app-tab-bar";
import { colors } from "@/config";
import { consumePendingInviteCode } from "@/lib/pending-invite";
import {
  addNotificationResponseListener,
  registerForPushNotifications,
} from "@/notifications/register";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

export const unstable_settings = {
  initialRouteName: "home",
};

export default function MainLayout() {
  const { user, loading, token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!token) return;
    void registerForPushNotifications(token).catch(() => {});
    const subscription = addNotificationResponseListener((groupId, screen) => {
      router.push(
        screen === "chat"
          ? `/(main)/groups/${groupId}/chat`
          : `/(main)/groups/${groupId}`
      );
    });
    return () => subscription.remove();
  }, [token, router]);

  useEffect(() => {
    if (!user) return;
    const pending = consumePendingInviteCode();
    if (pending) {
      router.replace(
        `/(main)/join-group?code=${encodeURIComponent(pending)}`
      );
    }
  }, [user, router]);

  if (loading || !user) {
    return <View style={styles.root} />;
  }

  return (
    <View style={styles.root}>
      <AppHeader />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: "none",
        }}
      >
        <Stack.Screen name="home" />
        <Stack.Screen name="performance" />
        <Stack.Screen name="account" />
        <Stack.Screen name="create-group" />
        <Stack.Screen name="join-group" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="groups/[id]" />
      </Stack>
      <AppTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
