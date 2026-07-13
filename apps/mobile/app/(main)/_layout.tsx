import { useAuth } from "@/auth/AuthProvider";
import { colors } from "@/config";
import {
  addNotificationResponseListener,
  registerForPushNotifications,
} from "@/notifications/register";
import { Redirect, Stack, useRouter } from "expo-router";
import { useEffect } from "react";

export default function MainLayout() {
  const { user, loading, token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!token) return;
    void registerForPushNotifications(token).catch(() => {});
    const subscription = addNotificationResponseListener((groupId) => {
      router.push(`/(main)/groups/${groupId}`);
    });
    return () => subscription.remove();
  }, [token, router]);

  if (!loading && !user) return <Redirect href="/sign-in" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "600" },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Your groups" }} />
      <Stack.Screen name="performance" options={{ title: "Performance" }} />
      <Stack.Screen name="create-group" options={{ title: "Create group" }} />
      <Stack.Screen name="join-group" options={{ title: "Join group" }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      <Stack.Screen name="groups/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
