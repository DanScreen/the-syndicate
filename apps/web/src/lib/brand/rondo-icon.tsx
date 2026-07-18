import { BRAND_COLORS } from "@tiki-acca/shared";
/**
 * Triangle rondo disc mark for favicon / app icon ImageResponse.
 * Mirrors `app/icon.svg` — wide apex-up triangle with three white players,
 * white passes, and a blue centre player. Plain primitives and explicit
 * chevrons keep Satori rendering identical to the browser/resvg cut.
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
      <line x1="122.62" y1="67.85" x2="146.04" y2="108.42" stroke={BRAND_COLORS.foreground} strokeWidth="10" strokeLinecap="round" />
      <path d="M141.47 114.31 L153.42 121.21 L153.42 107.41" fill="none" stroke={BRAND_COLORS.foreground} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="140.19" y1="142" x2="93.35" y2="142" stroke={BRAND_COLORS.foreground} strokeWidth="10" strokeLinecap="round" />
      <path d="M90.53 135.10 L78.58 142 L90.53 148.90" fill="none" stroke={BRAND_COLORS.foreground} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="67.19" y1="120.15" x2="90.62" y2="79.58" stroke={BRAND_COLORS.foreground} strokeWidth="10" strokeLinecap="round" />
      <path d="M98 80.59 L98 66.79 L86.05 73.69" fill="none" stroke={BRAND_COLORS.foreground} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="110" cy="46" r="14.5" fill={BRAND_COLORS.foreground} />
      <circle cx="165.42" cy="142" r="14.5" fill={BRAND_COLORS.foreground} />
      <circle cx="54.58" cy="142" r="14.5" fill={BRAND_COLORS.foreground} />
      <circle cx="110" cy="110" r="13.5" fill={BRAND_COLORS.accent} />
    </svg>
  );
}
