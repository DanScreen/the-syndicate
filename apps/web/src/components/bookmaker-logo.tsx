"use client";

import {
  bookmakerInitials,
  bookmakerLogoUrl,
  bookmakerRankPlace,
  type BookmakerRankPlace,
} from "@the-syndicate/shared";
import { useState } from "react";

export function BookmakerLogo({
  bookmakerId,
  name,
  size = 28,
}: {
  bookmakerId: string;
  name: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const src = bookmakerLogoUrl(bookmakerId, Math.max(64, size * 2));

  if (!src || failed) {
    return (
      <span
        aria-hidden
        className="inline-flex shrink-0 items-center justify-center rounded-md bg-border/80 text-[10px] font-bold tracking-wide text-muted"
        style={{ width: size, height: size }}
      >
        {bookmakerInitials(name)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-md bg-white object-contain p-0.5"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}

export function bookmakerRankRowClass(place: BookmakerRankPlace): string {
  switch (place) {
    case 1:
      return "border border-accent/60 bg-accent-muted/35 shadow-sm shadow-accent/10 ring-1 ring-accent/30";
    case 2:
      return "border border-slate-400/45 bg-slate-500/15";
    case 3:
      return "border border-amber-600/40 bg-amber-700/15";
    default:
      return "border border-transparent";
  }
}

export function bookmakerRankBadgeClass(place: BookmakerRankPlace): string {
  switch (place) {
    case 1:
      return "bg-accent text-black";
    case 2:
      return "bg-slate-300 text-slate-900";
    case 3:
      return "bg-amber-600/90 text-black";
    default:
      return "bg-border text-muted";
  }
}

export function bookmakerRankLabel(place: BookmakerRankPlace, index: number): string {
  if (place === 1) return "Best";
  return `#${index + 1}`;
}

export { bookmakerRankPlace };
