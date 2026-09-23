import { useState } from "react";
import { Image, Text, View } from "react-native";
import { bookmakerInitials, bookmakerLogoUrl } from "@tiki-acca/shared";
import { styles } from "./styles";

export function BookmakerLogo({
  bookmakerId,
  name,
  size = 28,
}: {
  bookmakerId: string;
  name: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const src = bookmakerLogoUrl(bookmakerId, Math.max(64, size * 2));

  if (!src || failed) {
    return (
      <View style={[styles.logoFallback, { width: size, height: size }]}>
        <Text style={styles.logoFallbackText}>{bookmakerInitials(name)}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: src }}
      style={[styles.logoImage, { width: size, height: size }]}
      onError={() => setFailed(true)}
    />
  );
}
