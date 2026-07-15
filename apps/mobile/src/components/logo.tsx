import { colors } from "@/config";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

/**
 * Triangle rondo — the Tiki Acca mark. Mirrors the web glyph exactly
 * (apps/web/src/components/logo.tsx): equilateral passing triangle, vertices
 * at −90°/30°/150° on a 58-unit circumradius, centroid at the viewBox centre
 * (110,110). Explicit chevron arrow tips, no SVG markers.
 */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 220 220" fill="none">
      {/* pass: top → right (the killer ball into the green player) */}
      <Line x1={121.5} y1={71.92} x2={142.73} y2={108.69} stroke="#22c55e" strokeWidth={11} strokeLinecap="round" />
      <Path d="M136.28 112.47 L149.23 119.95 L149.23 105" fill="none" stroke="#22c55e" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
      {/* pass: right → left (recycle along the base) */}
      <Line x1={137.23} y1={139} x2={94.77} y2={139} stroke="#4ade80" strokeWidth={11} strokeLinecap="round" />
      <Path d="M94.72 131.53 L81.77 139 L94.72 146.47" fill="none" stroke="#4ade80" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
      {/* pass: left → top (build-up) */}
      <Line x1={71.27} y1={119.08} x2={92.5} y2={82.31} stroke="#f1f5f9" strokeWidth={11} strokeLinecap="round" />
      <Path d="M99 86 L99 71.05 L86.05 78.53" fill="none" stroke="#f1f5f9" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
      {/* players */}
      <Circle cx={110} cy={52} r={16} fill="#f1f5f9" />
      <Circle cx={160.23} cy={139} r={16} fill="#22c55e" />
      <Circle cx={59.77} cy={139} r={16} fill="#f1f5f9" />
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
