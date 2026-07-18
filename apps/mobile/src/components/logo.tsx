import { colors } from "@/config";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

/**
 * Triangle rondo — the Tiki Acca mark. Mirrors the web glyph exactly
 * (apps/web/src/components/logo.tsx): extra-wide apex-up equilateral passing
 * apex-up triangle with three white players + white passes and a blue centre
 * player being passed around. Vertices at −90°/30°/150° on an extra-wide 86-unit
 * circumradius, centroid at (110,110). Explicit chevron arrow tips.
 */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 220 220" fill="none">
      {/* pass: top → right */}
      <Line x1={127.05} y1={53.54} x2={158.53} y2={108.06} stroke={colors.text} strokeWidth={11} strokeLinecap="round" />
      <Path d="M155.22 117.27 L168.17 124.75 L168.17 109.80" fill="none" stroke={colors.text} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
      {/* pass: right → left (base) */}
      <Line x1={150.38} y1={153} x2={87.42} y2={153} stroke={colors.text} strokeWidth={11} strokeLinecap="round" />
      <Path d="M81.09 145.53 L68.14 153 L81.09 160.47" fill="none" stroke={colors.text} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
      {/* pass: left → top (build-up) */}
      <Line x1={52.57} y1={123.46} x2={84.05} y2={68.94} stroke={colors.text} strokeWidth={11} strokeLinecap="round" />
      <Path d="M93.69 67.20 L93.69 52.25 L80.74 59.73" fill="none" stroke={colors.text} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
      {/* triangle players */}
      <Circle cx={110} cy={24} r={16} fill={colors.text} />
      <Circle cx={184.48} cy={153} r={16} fill={colors.text} />
      <Circle cx={35.52} cy={153} r={16} fill={colors.text} />
      {/* centre player being passed around */}
      <Circle cx={110} cy={110} r={15} fill={colors.accent} />
    </Svg>
  );
}

/** Mark + "Tiki Acca" wordmark lockup — matches the web header. */
export function Logo({ markSize = 36 }: { markSize?: number }) {
  return (
    <View style={styles.row}>
      <LogoMark size={markSize} />
      <Text style={styles.wordmark}>
        Tiki <Text style={styles.accent}>Acca</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  wordmark: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  accent: {
    color: colors.accent,
  },
});
