/**
 * Triangle rondo disc mark for favicon / app icon ImageResponse.
 * Mirrors `app/icon.svg` — plain SVG elements with explicit chevron arrow
 * tips so Satori can rasterise it (no markers, no context-stroke).
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
      <circle cx="110" cy="110" r="106" fill="#14532d" />
      <line x1="120.25" y1="75.75" x2="139.28" y2="108.72" stroke="#22c55e" strokeWidth="10" strokeLinecap="round" />
      <path d="M133.33 112.21 L145.28 119.11 L145.28 105.31" fill="none" stroke="#22c55e" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="134.53" y1="136" x2="96.47" y2="136" stroke="#4ade80" strokeWidth="10" strokeLinecap="round" />
      <path d="M96.42 129.1 L84.47 136 L96.42 142.9" fill="none" stroke="#4ade80" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="75.22" y1="118.25" x2="94.25" y2="85.28" stroke="#f1f5f9" strokeWidth="10" strokeLinecap="round" />
      <path d="M100.25 88.69 L100.25 74.89 L88.3 81.79" fill="none" stroke="#f1f5f9" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="110" cy="58" r="14.5" fill="#f1f5f9" />
      <circle cx="155.03" cy="136" r="14.5" fill="#22c55e" />
      <circle cx="64.97" cy="136" r="14.5" fill="#f1f5f9" />
    </svg>
  );
}
