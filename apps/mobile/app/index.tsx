import { useAuth } from "@/auth/AuthProvider";
import { colors } from "@/config";
import { peekPendingInviteCode } from "@/lib/pending-invite";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

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
    const pending = peekPendingInviteCode();
    if (pending) {
      return (
        <Redirect href={`/(main)/join-group?code=${encodeURIComponent(pending)}`} />
      );
    }
    return <Redirect href="/(main)" />;
  }

  return <Redirect href="/sign-in" />;
}
