/** Floodlight tokens — keep in sync with apps/web/src/app/globals.css and docs/BRAND.md */
export const BRAND_COLORS = {
  background: "#091422",
  card: "#0f1b2d",
  accent: "#38bdf8",
  accentBright: "#7dd3fc",
  accentMuted: "#0c4a6e",
  foreground: "#f1f5f9",
  muted: "#8fa3bb",
  border: "#1e2c40",
  /** Text/icon shade for wins and positive outcomes. Same as accent today, but
   * kept separate so a non-green accent never recolours "won". */
  success: "#4ade80",
  /** Surface/border shade for success states (used at low opacity). */
  successStrong: "#22c55e",
  /** Text/icon shade for losses and errors. */
  danger: "#f87171",
  /** Surface/border shade for danger states (badges, borders at low opacity). */
  dangerStrong: "#ef4444",
  /** Text/icon shade for waiting/attention states. */
  warning: "#fbbf24",
  /** Text colour on accent-filled surfaces (CTA buttons). */
  onAccent: "#000000",
} as const;

/**
 * Per-member line colours on the group points chart (web and mobile). Each must
 * differ from the others so a group of 2+ never shows identical lines.
 */
export const MEMBER_CHART_COLORS = [
  BRAND_COLORS.accent,
  BRAND_COLORS.warning,
  BRAND_COLORS.success,
  "#a78bfa",
  "#f472b6",
  "#fb923c",
  "#2dd4bf",
  BRAND_COLORS.danger,
] as const;

/** Shared marketing copy used by web and native entry screens. */
export const BRAND_TAGLINE = "Social group accas";
export const BRAND_HEADLINE = "Your Mates. One Acca. Every Leg Counts.";
export const BRAND_MOBILE_SUBHEAD =
  "Tiki-taka is football's great passing game: everyone touches the ball. In a group acca, everyone touches the bet. Everyone picks one leg. We lock the best odds, track every result, and keep score.";
