import { useAuth } from "@/auth/AuthProvider";
import { colors } from "@/config";
import { setPendingInviteCode } from "@/lib/pending-invite";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

/** Deep link: tikiacca://groups/join?code=INVITE */
export default function DeepLinkJoinScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (code) setPendingInviteCode(code);
  }, [code]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  const href = code
    ? (`/(main)/join-group?code=${encodeURIComponent(code)}` as const)
    : "/(main)/join-group";

  return <Redirect href={href} />;
}
