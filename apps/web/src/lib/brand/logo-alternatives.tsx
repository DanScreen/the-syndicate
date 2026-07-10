/**
 * Archived logo mark SVGs — for reference only. Production uses Acca stack in components/logo.tsx.
 */

import type { ArchivedLogoVariant } from "./archive";

function MarkCrest() {
  return (
    <>
      <rect width="40" height="40" rx="10" className="fill-accent-muted/60" />
      <path
        d="M20 8L30 12V20C30 26.5 25.5 31 20 33C14.5 31 10 26.5 10 20V12L20 8Z"
        className="fill-accent/25 stroke-accent"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect x="16" y="15" width="2.5" height="12" rx="1" className="fill-accent" />
      <rect x="20" y="15" width="2.5" height="12" rx="1" className="fill-accent/75" />
      <rect x="24" y="15" width="2.5" height="12" rx="1" className="fill-accent/50" />
    </>
  );
}

function MarkPitch() {
  return (
    <>
      <rect width="40" height="40" rx="10" className="fill-accent-muted/60" />
      <path
        d="M8 32V14C8 10.5 10.5 8 14 8H32"
        className="stroke-accent"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="20" cy="20" r="5" className="stroke-accent/60" strokeWidth="1.5" fill="none" />
      <circle cx="20" cy="20" r="1.5" className="fill-accent" />
    </>
  );
}

function MarkMonogram() {
  return (
    <>
      <rect width="40" height="40" rx="10" className="fill-accent-muted/60" />
      <path
        d="M26 10C26 10 18 10 16 16C14 22 22 22 22 22C22 22 14 22 12 28C10 34 18 34 26 34"
        className="stroke-accent"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </>
  );
}

function MarkNodes() {
  return (
    <>
      <rect width="40" height="40" rx="10" className="fill-accent-muted/60" />
      <circle cx="12" cy="20" r="4" className="fill-accent" />
      <circle cx="28" cy="12" r="4" className="fill-accent" />
      <circle cx="28" cy="28" r="4" className="fill-accent" />
      <path
        d="M15.5 19.5L24.5 13.5M15.5 20.5L24.5 26.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        className="text-foreground/80"
      />
    </>
  );
}

const marks: Record<ArchivedLogoVariant, () => React.ReactNode> = {
  crest: MarkCrest,
  pitch: MarkPitch,
  monogram: MarkMonogram,
  nodes: MarkNodes,
};

export function ArchivedLogoMark({
  variant,
  size = 40,
  className,
}: {
  variant: ArchivedLogoVariant;
  size?: number;
  className?: string;
}) {
  const Mark = marks[variant];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <Mark />
    </svg>
  );
}
