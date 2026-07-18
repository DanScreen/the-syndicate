import { BRAND_COLORS } from "@tiki-acca/shared";
/**
 * Triangle rondo disc mark for favicon / app icon ImageResponse.
 * Mirrors `app/icon.svg` — inverted (apex-down) triangle with three white
 * players + white passes and a green centre player. The vertical flip is
 * BAKED into the coordinates here (reflected about y=110) rather than applied
 * as a transform, because Satori's SVG transform support is unreliable — plain
 * primitives keep it identical to the browser/resvg cut. Explicit chevron
 * arrow tips (no markers, no context-stroke) so Satori can rasterise it.
 */
export function RondoDiscMark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 220 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="110" cy="110" r="106" fill={BRAND_COLORS.accentMuted} />
      <line x1="120.25" y1="144.25" x2="139.28" y2="111.28" stroke={BRAND_COLORS.foreground} strokeWidth="10" strokeLinecap="round" />
      <path d="M133.33 107.79 L145.28 100.89 L145.28 114.69" fill="none" stroke={BRAND_COLORS.foreground} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="134.53" y1="84" x2="96.47" y2="84" stroke={BRAND_COLORS.foreground} strokeWidth="10" strokeLinecap="round" />
      <path d="M96.42 90.9 L84.47 84 L96.42 77.1" fill="none" stroke={BRAND_COLORS.foreground} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="75.22" y1="101.75" x2="94.25" y2="134.72" stroke={BRAND_COLORS.foreground} strokeWidth="10" strokeLinecap="round" />
      <path d="M100.25 131.31 L100.25 145.11 L88.3 138.21" fill="none" stroke={BRAND_COLORS.foreground} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="110" cy="162" r="14.5" fill={BRAND_COLORS.foreground} />
      <circle cx="155.03" cy="84" r="14.5" fill={BRAND_COLORS.foreground} />
      <circle cx="64.97" cy="84" r="14.5" fill={BRAND_COLORS.foreground} />
      <circle cx="110" cy="110" r="13.5" fill={BRAND_COLORS.accent} />
    </svg>
  );
}
