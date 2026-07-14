import { formatLegPoints, pointsTone } from "@tiki-acca/shared";

export function pointsTextClass(points: number): string {
  const tone = pointsTone(points);
  if (tone === "positive") return "text-accent";
  if (tone === "negative") return "text-red-400";
  return "text-muted";
}

export function PointsText({
  points,
  label,
  className,
}: {
  points: number;
  label?: string;
  className?: string;
}) {
  return (
    <span className={`font-medium tabular-nums ${pointsTextClass(points)} ${className ?? ""}`}>
      {label ? `${label}: ` : ""}
      {formatLegPoints(points)} pts
    </span>
  );
}
