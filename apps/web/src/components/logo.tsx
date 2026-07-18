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
 * Geometry is exact — vertices at −90°/30°/150° on an extra-wide 86-unit
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
        <line x1="127.05" y1="53.54" x2="158.53" y2="108.06" stroke={BRAND_COLORS.foreground} strokeWidth="11" strokeLinecap="round" />
        <path d="M155.22 117.27 L168.17 124.75 L168.17 109.80" fill="none" stroke={BRAND_COLORS.foreground} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
        {/* pass: right → left (base) */}
        <line x1="150.38" y1="153" x2="87.42" y2="153" stroke={BRAND_COLORS.foreground} strokeWidth="11" strokeLinecap="round" />
        <path d="M81.09 145.53 L68.14 153 L81.09 160.47" fill="none" stroke={BRAND_COLORS.foreground} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
        {/* pass: left → top (build-up) */}
        <line x1="52.57" y1="123.46" x2="84.05" y2="68.94" stroke={BRAND_COLORS.foreground} strokeWidth="11" strokeLinecap="round" />
        <path d="M93.69 67.20 L93.69 52.25 L80.74 59.73" fill="none" stroke={BRAND_COLORS.foreground} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
        {/* triangle players */}
        <circle cx="110" cy="24" r="16" fill={BRAND_COLORS.foreground} />
        <circle cx="184.48" cy="153" r="16" fill={BRAND_COLORS.foreground} />
        <circle cx="35.52" cy="153" r="16" fill={BRAND_COLORS.foreground} />
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
