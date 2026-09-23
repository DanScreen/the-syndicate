import { pointsTone } from "@tiki-acca/shared";
import { colors } from "@/config";

export function outcomeColors(outcome: string) {
  if (outcome === "won") {
    return {
      border: "rgba(34, 197, 94, 0.4)",
      bg: "rgba(34, 197, 94, 0.1)",
      text: colors.accentBright,
    };
  }
  if (outcome === "lost") {
    return {
      border: "rgba(248, 113, 113, 0.4)",
      bg: "rgba(248, 113, 113, 0.1)",
      text: colors.danger,
    };
  }
  return {
    border: colors.border,
    bg: colors.card,
    text: colors.muted,
  };
}

export function pointsStyle(value: number) {
  const tone = pointsTone(value);
  if (tone === "positive") return { color: colors.success };
  if (tone === "negative") return { color: colors.danger };
  return { color: colors.muted };
}
