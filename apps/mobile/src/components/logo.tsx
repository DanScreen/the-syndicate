import { colors } from "@/config";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

/**
 * Triangle rondo — the Tiki Acca mark. Mirrors the web glyph exactly
 * (apps/web/src/components/logo.tsx): wide apex-up equilateral passing
 * apex-up triangle with three white players + white passes and a blue centre
 * player being passed around. Vertices at −90°/30°/150° on a widened 72-unit
 * circumradius, centroid at (110,110). Explicit chevron arrow tips.
 */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 220 220" fill="none">
      {/* pass: top → right */}
      <Line x1={124.28} y1={62.73} x2={150.63} y2={108.37} stroke={colors.text} strokeWidth={11} strokeLinecap="round" />
      <Path d="M145.75 114.87 L158.70 122.35 L158.70 107.40" fill="none" stroke={colors.text} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
      {/* pass: right → left (base) */}
      <Line x1={143.80} y1={146} x2={91.09} y2={146} stroke={colors.text} strokeWidth={11} strokeLinecap="round" />
      <Path d="M87.91 138.53 L74.96 146 L87.91 153.47" fill="none" stroke={colors.text} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
      {/* pass: left → top (build-up) */}
      <Line x1={61.92} y1={121.27} x2={88.28} y2={75.63} stroke={colors.text} strokeWidth={11} strokeLinecap="round" />
      <Path d="M96.34 76.60 L96.34 61.65 L83.39 69.13" fill="none" stroke={colors.text} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
      {/* triangle players */}
      <Circle cx={110} cy={38} r={16} fill={colors.text} />
      <Circle cx={172.35} cy={146} r={16} fill={colors.text} />
      <Circle cx={47.65} cy={146} r={16} fill={colors.text} />
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
