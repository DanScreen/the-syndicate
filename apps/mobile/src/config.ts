import { BRAND_COLORS } from "@the-syndicate/shared";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

/** Turf Green — sourced from @the-syndicate/shared (matches web globals.css) */
export const colors = {
  bg: BRAND_COLORS.background,
  card: BRAND_COLORS.card,
  border: BRAND_COLORS.border,
  text: BRAND_COLORS.foreground,
  muted: BRAND_COLORS.muted,
  accent: BRAND_COLORS.accent,
  accentBright: BRAND_COLORS.accentBright,
  accentMuted: BRAND_COLORS.accentMuted,
  danger: BRAND_COLORS.danger,
};
