import Link from "next/link";

type LogoProps = {
  className?: string;
  href?: string;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: 28,
  md: 36,
  lg: 46,
};

/**
 * Triangle rondo — the Tiki Acca mark ("T4 heavy cut", July 2026).
 *
 * An equilateral passing triangle circulating clockwise: white build-up
 * pass, accent killer pass into the green player, bright recycle pass along
 * the base. Geometry is exact — vertices at −90°/30°/150° on a 58-unit
 * circumradius, centroid at the viewBox centre (110,110) — so the mark is
 * rotationally symmetric by construction. Arrow tips are explicit chevron
 * paths at the same stroke weight as the pass lines (no SVG markers), so
 * the mark renders identically in browsers, Satori/ImageResponse, resvg,
 * and canvas re-implementations.
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
      {/* pass: top → right (the killer ball into the green player) */}
      <line x1="121.5" y1="71.92" x2="142.73" y2="108.69" stroke="#22c55e" strokeWidth="11" strokeLinecap="round" />
      <path d="M136.28 112.47 L149.23 119.95 L149.23 105" fill="none" stroke="#22c55e" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      {/* pass: right → left (recycle along the base) */}
      <line x1="137.23" y1="139" x2="94.77" y2="139" stroke="#4ade80" strokeWidth="11" strokeLinecap="round" />
      <path d="M94.72 131.53 L81.77 139 L94.72 146.47" fill="none" stroke="#4ade80" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      {/* pass: left → top (build-up) */}
      <line x1="71.27" y1="119.08" x2="92.5" y2="82.31" stroke="#f1f5f9" strokeWidth="11" strokeLinecap="round" />
      <path d="M99 86 L99 71.05 L86.05 78.53" fill="none" stroke="#f1f5f9" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      {/* players */}
      <circle cx="110" cy="52" r="16" fill="#f1f5f9" />
      <circle cx="160.23" cy="139" r="16" fill="#22c55e" />
      <circle cx="59.77" cy="139" r="16" fill="#f1f5f9" />
    </svg>
  );
}

export function Logo({ className, href = "/", size = "md" }: LogoProps) {
  const mark = <LogoMark size={sizes[size]} className={className} />;

  if (href) {
    return (
      <Link
        href={href}
        aria-label="Tiki Acca home"
        className="inline-flex transition-opacity hover:opacity-90"
      >
        {mark}
      </Link>
    );
  }

  return mark;
}
