import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { getAvatarColor, getInitials } from "@tiki-acca/shared";
import { API_URL, colors } from "@/config";

export function Avatar({
  name,
  userId,
  size = 32,
  variant = "filled",
  imageUrl,
}: {
  name: string;
  userId: string;
  size?: number;
  variant?: "filled" | "pending";
  /** Site-relative profile picture (`/api/avatars/...`), or null/undefined for initials. */
  imageUrl?: string | null;
}) {
  const pending = variant === "pending";
  // Remember which URL failed, so a new upload (new URL) gets a fresh attempt.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = !pending && !!imageUrl && failedUrl !== imageUrl;
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
      {showImage ? (
        <Image
          source={{ uri: `${API_URL}${imageUrl}` }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          onError={() => setFailedUrl(imageUrl ?? null)}
          accessibilityIgnoresInvertColors
        />
      ) : (
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
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
