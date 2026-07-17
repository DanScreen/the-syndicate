import { Card } from "@/components/ui";
import { colors } from "@/config";
import { formatLegPoints } from "@tiki-acca/shared";
import { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";

export type PointsChartPoint = {
  label: string;
  cumulativePoints: number;
  roundPoints?: number;
  subtitle?: string;
};

const CHART_HEIGHT = 180;
const PADDING = { top: 12, right: 12, bottom: 28, left: 36 };

export function PointsLineChart({
  title,
  points,
  minPoints = 2,
}: {
  title: string;
  points: PointsChartPoint[];
  /** Match web: user performance chart needs 2+ settled rounds. */
  minPoints?: number;
}) {
  const [width, setWidth] = useState(0);

  const chart = useMemo(() => {
    if (points.length < minPoints || width <= 0) return null;

    const values = points.map((p) => p.cumulativePoints);
    const minY = Math.min(0, ...values);
    const maxY = Math.max(...values);
    const yRange = maxY - minY || 1;

    const innerW = width - PADDING.left - PADDING.right;
    const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom;

    const coords = points.map((p, i) => {
      const x =
        points.length === 1
          ? PADDING.left + innerW / 2
          : PADDING.left + (i / (points.length - 1)) * innerW;
      const y =
        PADDING.top + innerH - ((p.cumulativePoints - minY) / yRange) * innerH;
      return { x, y, point: p };
    });

    const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");

    // Top → bottom: matches SVG (higher values nearer PADDING.top).
    const yTicks = [
      ...new Set([maxY, minY + yRange / 2, minY].map((v) => Math.round(v))),
    ];

    return { coords, polyline, yTicks, minY, maxY };
  }, [minPoints, points, width]);

  function onLayout(e: LayoutChangeEvent) {
    setWidth(e.nativeEvent.layout.width);
  }

  if (points.length < minPoints) {
    return (
      <Card>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.hint}>
          Chart appears after {minPoints}+ settled round{minPoints === 1 ? "" : "s"}.
        </Text>
      </Card>
    );
  }

  return (
    <Card>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.chartWrap} onLayout={onLayout}>
        {chart ? (
          <>
            <View style={styles.yAxis}>
              {chart.yTicks.map((tick, i) => (
                <Text key={`y-${i}-${tick}`} style={styles.axisLabel}>
                  {tick}
                </Text>
              ))}
            </View>
            <Svg width={width} height={CHART_HEIGHT}>
              {[0, 0.5, 1].map((frac) => {
                const y = PADDING.top + frac * (CHART_HEIGHT - PADDING.top - PADDING.bottom);
                return (
                  <Line
                    key={frac}
                    x1={PADDING.left}
                    y1={y}
                    x2={width - PADDING.right}
                    y2={y}
                    stroke={colors.border}
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                );
              })}
              <Polyline
                points={chart.polyline}
                fill="none"
                stroke={colors.accent}
                strokeWidth={2}
              />
              {chart.coords.map((c, i) => (
                <Circle
                  key={i}
                  cx={c.x}
                  cy={c.y}
                  r={4}
                  fill={colors.accent}
                />
              ))}
            </Svg>
            <View style={styles.xAxis}>
              {points.map((p, i) => (
                <Text key={i} style={styles.xLabel} numberOfLines={1}>
                  {p.label}
                </Text>
              ))}
            </View>
          </>
        ) : null}
      </View>
      <View style={styles.legend}>
        {points.map((p, i) => (
          <View key={i} style={styles.legendRow}>
            <View style={styles.legendLeft}>
              <Text style={styles.legendLabel}>{p.label}</Text>
              {p.subtitle ? <Text style={styles.hint}>{p.subtitle}</Text> : null}
            </View>
            <View style={styles.legendRight}>
              {p.roundPoints != null ? (
                <Text style={styles.hint}>{formatLegPoints(p.roundPoints)} rnd</Text>
              ) : null}
              <Text style={styles.total}>{formatLegPoints(p.cumulativePoints)} total</Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
  },
  chartWrap: {
    minHeight: CHART_HEIGHT,
    marginBottom: 8,
  },
  yAxis: {
    position: "absolute",
    left: 0,
    top: PADDING.top,
    height: CHART_HEIGHT - PADDING.top - PADDING.bottom,
    width: PADDING.left - 4,
    justifyContent: "space-between",
    zIndex: 1,
  },
  axisLabel: {
    color: colors.muted,
    fontSize: 10,
    textAlign: "right",
  },
  xAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: PADDING.left,
    marginTop: 4,
  },
  xLabel: {
    flex: 1,
    color: colors.muted,
    fontSize: 10,
    textAlign: "center",
  },
  legend: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 8,
    paddingTop: 4,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 8,
    gap: 8,
  },
  legendLeft: {
    flex: 1,
  },
  legendRight: {
    alignItems: "flex-end",
  },
  legendLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  total: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
});
