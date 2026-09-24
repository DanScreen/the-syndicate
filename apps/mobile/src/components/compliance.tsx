import { COMPLIANCE } from "@tiki-acca/shared";
import { colors } from "@/config";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

function openGambleAware() {
  void Linking.openURL(COMPLIANCE.gambleawareUrl);
}

export function BetslipDisclosure() {
  return (
    <Text style={styles.disclosure}>
      {COMPLIANCE.betslipDisclosure}{" "}
      <Text style={styles.link} onPress={openGambleAware}>
        {COMPLIANCE.gambleawareLabel}
      </Text>
      .
    </Text>
  );
}

export function GambleResponsiblyFooter() {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerTitle}>{COMPLIANCE.footerTitle}</Text>
      <Text style={styles.footerBody}>{COMPLIANCE.footerBody}</Text>
      <Pressable onPress={openGambleAware}>
        <Text style={styles.footerBody}>
          Need support? Visit{" "}
          <Text style={styles.link}>{COMPLIANCE.gambleawareLabel}</Text> or call the{" "}
          {COMPLIANCE.helplineName} on {COMPLIANCE.helplineNumber}.
        </Text>
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
