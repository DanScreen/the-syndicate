import { copy } from "@/lib/copy";
import { colors } from "@/config";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

export function BetslipDisclosure() {
  return (
    <Text style={styles.disclosure}>{copy.compliance.betslip}</Text>
  );
}

export function GambleResponsiblyFooter() {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerTitle}>{copy.compliance.footerTitle}</Text>
      <Text style={styles.footerBody}>{copy.compliance.footerBody}</Text>
      <Pressable onPress={() => Linking.openURL(copy.compliance.begambleawareUrl)}>
        <Text style={styles.link}>{copy.compliance.helpline}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  disclosure: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  footer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  footerTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  footerBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  link: {
    color: colors.accent,
    fontSize: 13,
    lineHeight: 20,
  },
});
