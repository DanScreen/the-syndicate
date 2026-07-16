import { colors } from "@/config";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

/**
 * Triangle rondo — the Tiki Acca mark. Mirrors the web glyph exactly
 * (apps/web/src/components/logo.tsx): inverted (apex-down) equilateral passing
 * triangle with three white players + white passes and a green centre
 * player being passed around. Vertices at −90°/30°/150° on a 58-unit
 * circumradius, centroid at (110,110), reflected vertically about the centre —
 * the flip is baked into the coordinates (no transform) so react-native-svg
 * renders it identically. Explicit chevron arrow tips, no SVG markers.
 */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 220 220" fill="none">
      {/* pass: top → right */}
      <Line x1={121.5} y1={148.08} x2={142.73} y2={111.31} stroke="#f1f5f9" strokeWidth={11} strokeLinecap="round" />
      <Path d="M136.28 107.53 L149.23 100.05 L149.23 115" fill="none" stroke="#f1f5f9" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
      {/* pass: right → left (base) */}
      <Line x1={137.23} y1={81} x2={94.77} y2={81} stroke="#f1f5f9" strokeWidth={11} strokeLinecap="round" />
      <Path d="M94.72 88.47 L81.77 81 L94.72 73.53" fill="none" stroke="#f1f5f9" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
      {/* pass: left → top (build-up) */}
      <Line x1={71.27} y1={100.92} x2={92.5} y2={137.69} stroke="#f1f5f9" strokeWidth={11} strokeLinecap="round" />
      <Path d="M99 134 L99 148.95 L86.05 141.47" fill="none" stroke="#f1f5f9" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
      {/* triangle players */}
      <Circle cx={110} cy={168} r={16} fill="#f1f5f9" />
      <Circle cx={160.23} cy={81} r={16} fill="#f1f5f9" />
      <Circle cx={59.77} cy={81} r={16} fill="#f1f5f9" />
      {/* centre player being passed around */}
      <Circle cx={110} cy={110} r={15} fill="#22c55e" />
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
