import { useAuth } from "@/auth/AuthProvider";
import { colors } from "@/config";
import { Redirect, Stack } from "expo-router";

export default function MainLayout() {
  const { user, loading } = useAuth();

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
      <Stack.Screen name="groups/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
