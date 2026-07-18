import { AuthProvider, useAuth } from "@/auth/AuthProvider";
import { ActivityTracker } from "@/analytics/activity-tracker";
import { colors } from "@/config";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const signedIn = !!user;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "600" },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(main)" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="sign-up" options={{ title: "Sign up" }} />
      </Stack.Protected>

      {/* Entry + deep-link helpers. Tabs use /(main)/home, not this index. */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="groups/join" options={{ headerShown: false }} />
      <Stack.Screen name="groups/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <ActivityTracker />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
