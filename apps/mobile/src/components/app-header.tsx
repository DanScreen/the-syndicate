import { LogoMark } from "@/components/logo";
import { colors } from "@/config";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Brand-only header — navigation lives in the bottom tab bar. */
export function AppHeader() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 8) }]}>
      <View style={styles.brand}>
        <LogoMark size={28} />
        <Text style={styles.wordmark}>
          Tiki <Text style={styles.accent}>Acca</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  wordmark: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  accent: {
    color: colors.accent,
  },
});
