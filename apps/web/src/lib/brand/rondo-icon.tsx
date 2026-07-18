import { BRAND_COLORS } from "@tiki-acca/shared";
/**
 * Triangle rondo disc mark for favicon / app icon ImageResponse.
 * Mirrors `app/icon.svg` — extra-wide apex-up triangle with three white players,
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
      <line x1="124.98" y1="59.94" x2="152.79" y2="108.13" stroke={BRAND_COLORS.foreground} strokeWidth="10" strokeLinecap="round" />
      <path d="M149.61 116.41 L161.56 123.31 L161.56 109.51" fill="none" stroke={BRAND_COLORS.foreground} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="145.85" y1="148" x2="90.23" y2="148" stroke={BRAND_COLORS.foreground} strokeWidth="10" strokeLinecap="round" />
      <path d="M84.64 141.10 L72.69 148 L84.64 154.90" fill="none" stroke={BRAND_COLORS.foreground} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="59.17" y1="122.06" x2="86.98" y2="73.87" stroke={BRAND_COLORS.foreground} strokeWidth="10" strokeLinecap="round" />
      <path d="M95.75 72.49 L95.75 58.69 L83.80 65.59" fill="none" stroke={BRAND_COLORS.foreground} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="110" cy="34" r="14.5" fill={BRAND_COLORS.foreground} />
      <circle cx="175.81" cy="148" r="14.5" fill={BRAND_COLORS.foreground} />
      <circle cx="44.19" cy="148" r="14.5" fill={BRAND_COLORS.foreground} />
      <circle cx="110" cy="110" r="13.5" fill={BRAND_COLORS.accent} />
    </svg>
  );
}
