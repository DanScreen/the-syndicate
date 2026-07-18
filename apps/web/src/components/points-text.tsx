import {
  formatLegPoints,
  pointsTone,
  pointsToneFromOutcome,
  type PointsTone,
} from "@tiki-acca/shared";

export function toneTextClass(tone: PointsTone): string {
  if (tone === "positive") return "text-success";
  if (tone === "negative") return "text-danger";
  return "text-muted";
}

export function pointsTextClass(points: number, outcome?: string): string {
  const tone = outcome ? pointsToneFromOutcome(outcome) : pointsTone(points);
  return toneTextClass(tone);
}

export function PointsText({
  points,
  label,
  className,
  /** When set, colour follows pick outcome (won/lost), not the points value. */
  outcome,
}: {
  points: number;
  label?: string;
  className?: string;
  outcome?: string;
}) {
  return (
    <span
      className={`font-medium tabular-nums ${pointsTextClass(points, outcome)} ${className ?? ""}`}
    >
      {label ? `${label}: ` : ""}
      {formatLegPoints(points)} pts
    </span>
  );
}
