import { StyleSheet, Text, View } from "react-native";
import { getAvatarColor, getInitials } from "@tiki-acca/shared";
import { colors } from "@/config";

export function Avatar({
  name,
  userId,
  size = 32,
  variant = "filled",
}: {
  name: string;
  userId: string;
  size?: number;
  variant?: "filled" | "pending";
}) {
  const pending = variant === "pending";
  return (
    <View
      accessibilityLabel={name}
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: pending ? "transparent" : getAvatarColor(userId),
        },
        pending ? styles.pending : null,
      ]}
    >
      <Text
        style={[
          styles.initials,
          {
            fontSize: size * 0.4,
            color: pending ? colors.muted : colors.bg,
          },
        ]}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
  },
  pending: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.muted,
  },
  initials: {
    fontWeight: "700",
  },
});
