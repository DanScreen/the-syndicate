import { useAuth } from "@/auth/AuthProvider";
import { colors } from "@/config";
import { Redirect, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";

/** Deep link: the-syndicate://groups/{groupId} */
export default function DeepLinkGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, loading } = useAuth();

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

  if (!id) {
    return <Redirect href="/(main)" />;
  }

  return <Redirect href={`/(main)/groups/${id}`} />;
}
