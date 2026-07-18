import { BRAND_COLORS } from "@tiki-acca/shared";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

/** Public marketing site, used for legal pages (privacy, cookies) linked from the app. */
export const WEB_URL =
  process.env.EXPO_PUBLIC_WEB_URL ?? "https://www.tikiacca.com";

/** Floodlight — sourced from @tiki-acca/shared (matches web globals.css) */
export const colors = {
  bg: BRAND_COLORS.background,
  card: BRAND_COLORS.card,
  border: BRAND_COLORS.border,
  text: BRAND_COLORS.foreground,
  muted: BRAND_COLORS.muted,
  accent: BRAND_COLORS.accent,
  accentBright: BRAND_COLORS.accentBright,
  accentMuted: BRAND_COLORS.accentMuted,
  success: BRAND_COLORS.success,
  successStrong: BRAND_COLORS.successStrong,
  danger: BRAND_COLORS.danger,
  dangerStrong: BRAND_COLORS.dangerStrong,
  warning: BRAND_COLORS.warning,
  onAccent: BRAND_COLORS.onAccent,
};
