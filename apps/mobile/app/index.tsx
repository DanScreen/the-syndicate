import { useAuth } from "@/auth/AuthProvider";
import { colors } from "@/config";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

/**
 * Entry route for `/` only. Primary app screens live under `/(main)/home` etc.
 * so tab navigation never lands here (that used to flash auth screens).
 */
export default function Index() {
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

  if (user) {
    return <Redirect href="/(main)/home" />;
  }

  return <Redirect href="/sign-in" />;
}
