import { useAuth } from "@/auth/AuthProvider";
import { GambleResponsiblyFooter } from "@/components/compliance";
import { UserPerformancePanel } from "@/components/stats";
import { Screen, Subtitle, Title } from "@/components/ui";
import { colors } from "@/config";
import { ScrollView, StyleSheet } from "react-native";

export default function PerformanceScreen() {
  const { token, user } = useAuth();

  if (!token || !user) return null;

  return (
    <Screen>
      <Title>Your performance</Title>
      <Subtitle>Cross-group stats and trends.</Subtitle>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <UserPerformancePanel token={token} userName={user.name} />
        <GambleResponsiblyFooter />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
});
