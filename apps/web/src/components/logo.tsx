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
 * Triangle rondo — the Tiki Acca mark ("inverted rondo cut", July 2026).
 *
 * An inverted (apex-down) equilateral passing triangle: three white players
 * at the points, white passes circulating between them, and a green
 * player in the centre being passed around (the rondo "piggy in the middle").
 * Geometry is exact — vertices at −90°/30°/150° on a 58-unit circumradius,
 * centroid at the viewBox centre (110,110), reflected vertically about the
 * centre. Arrow tips are explicit chevron paths at the same stroke weight as
 * the pass lines (no SVG markers). The reflect transform is DOM/RN-safe; the
 * Satori/ImageResponse cut (`lib/brand/rondo-icon.tsx`) bakes the same flip
 * into coordinates so every rasteriser agrees.
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
      {/* Triangle players + passes, reflected vertically (apex down). */}
      <g transform="translate(0,220) scale(1,-1)">
        {/* pass: top → right */}
        <line x1="121.5" y1="71.92" x2="142.73" y2="108.69" stroke={BRAND_COLORS.foreground} strokeWidth="11" strokeLinecap="round" />
        <path d="M136.28 112.47 L149.23 119.95 L149.23 105" fill="none" stroke={BRAND_COLORS.foreground} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
        {/* pass: right → left (base) */}
        <line x1="137.23" y1="139" x2="94.77" y2="139" stroke={BRAND_COLORS.foreground} strokeWidth="11" strokeLinecap="round" />
        <path d="M94.72 131.53 L81.77 139 L94.72 146.47" fill="none" stroke={BRAND_COLORS.foreground} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
        {/* pass: left → top (build-up) */}
        <line x1="71.27" y1="119.08" x2="92.5" y2="82.31" stroke={BRAND_COLORS.foreground} strokeWidth="11" strokeLinecap="round" />
        <path d="M99 86 L99 71.05 L86.05 78.53" fill="none" stroke={BRAND_COLORS.foreground} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
        {/* triangle players */}
        <circle cx="110" cy="52" r="16" fill={BRAND_COLORS.foreground} />
        <circle cx="160.23" cy="139" r="16" fill={BRAND_COLORS.foreground} />
        <circle cx="59.77" cy="139" r="16" fill={BRAND_COLORS.foreground} />
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
