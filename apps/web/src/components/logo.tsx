import { BRAND_COLORS } from "@tiki-acca/shared";
import Link from "next/link";

type LogoProps = {
  className?: string;
  showWordmark?: boolean;
  href?: string;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: { mark: 34, text: "text-lg" },
  md: { mark: 44, text: "text-xl" },
  lg: { mark: 54, text: "text-2xl" },
};

/**
 * Triangle rondo — the Tiki Acca mark ("wide rondo cut", July 2026).
 *
 * An apex-up equilateral passing triangle: three white players
 * at the points, white passes circulating between them, and a green
 * player in the centre being passed around (the rondo "piggy in the middle").
 * Geometry is exact — vertices at −90°/30°/150° on a widened 72-unit
 * circumradius, centroid at the viewBox centre (110,110). Arrow tips are
 * explicit chevron paths at the same stroke weight as the pass lines.
 *
 * Standalone glyph — no disc, no wordmark. The disc-backed variant lives in
 * `app/icon.svg` / app icons, where tab and home-screen contrast demands it.
 */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 220 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Triangle players + passes (wide, apex up). */}
      <g>
        {/* pass: top → right */}
        <line x1="124.28" y1="62.73" x2="150.63" y2="108.37" stroke={BRAND_COLORS.foreground} strokeWidth="11" strokeLinecap="round" />
        <path d="M145.75 114.87 L158.70 122.35 L158.70 107.40" fill="none" stroke={BRAND_COLORS.foreground} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
        {/* pass: right → left (base) */}
        <line x1="143.80" y1="146" x2="91.09" y2="146" stroke={BRAND_COLORS.foreground} strokeWidth="11" strokeLinecap="round" />
        <path d="M87.91 138.53 L74.96 146 L87.91 153.47" fill="none" stroke={BRAND_COLORS.foreground} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
        {/* pass: left → top (build-up) */}
        <line x1="61.92" y1="121.27" x2="88.28" y2="75.63" stroke={BRAND_COLORS.foreground} strokeWidth="11" strokeLinecap="round" />
        <path d="M96.34 76.60 L96.34 61.65 L83.39 69.13" fill="none" stroke={BRAND_COLORS.foreground} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
        {/* triangle players */}
        <circle cx="110" cy="38" r="16" fill={BRAND_COLORS.foreground} />
        <circle cx="172.35" cy="146" r="16" fill={BRAND_COLORS.foreground} />
        <circle cx="47.65" cy="146" r="16" fill={BRAND_COLORS.foreground} />
      </g>
      {/* centre player being passed around (orientation-invariant) */}
      <circle cx="110" cy="110" r="15" fill={BRAND_COLORS.accent} />
    </svg>
  );
}

export function Logo({
  className,
  showWordmark = true,
  href = "/",
  size = "md",
}: LogoProps) {
  const { mark, text } = sizes[size];

  const content = (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark size={mark} />
      {showWordmark && (
        <span className={`${text} font-bold tracking-tight`}>
          Tiki <span className="text-accent">Acca</span>
        </span>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} aria-label="Tiki Acca home" className="transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
