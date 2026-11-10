"use client";

import { getAvatarColor, getInitials } from "@tiki-acca/shared";
import { useState } from "react";

const SIZES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-11 w-11 text-base",
  xl: "h-20 w-20 text-2xl",
} as const;

/**
 * Profile picture when `imageUrl` is set, otherwise initials on the member's
 * colour (same palette and hash as the mobile app). If the picture fails to
 * load, falls back to initials. "pending" (not picked yet) draws a dashed ring
 * around a faded greyscale photo, or around initials when there's no photo.
 * Decorative by default: pass `label` only when no name is written alongside.
 */
export function Avatar({
  name,
  userId,
  size = "sm",
  variant = "filled",
  label,
  imageUrl,
  className = "",
}: {
  name: string;
  userId: string;
  size?: keyof typeof SIZES;
  variant?: "filled" | "pending";
  label?: string;
  /** Site-relative profile picture URL, or null/undefined for initials. */
  imageUrl?: string | null;
  className?: string;
}) {
  // Remember the URL that failed, so a new upload (new URL) gets a fresh attempt.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const pending = variant === "pending";

  const hasImage = !!imageUrl && imageUrl !== failedUrl;

  if (pending && hasImage) {
    return (
      <span
        className={`grid shrink-0 place-items-center rounded-full border-2 border-dashed border-muted/70 p-0.5 ${SIZES[size]} ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={label ?? ""}
          loading="lazy"
          decoding="async"
          onError={() => setFailedUrl(imageUrl)}
          className="h-full w-full rounded-full object-cover opacity-45 grayscale"
        />
      </span>
    );
  }

  if (hasImage) {
    return (
      // Pictures are already 256px WebP with immutable caching; next/image adds nothing here.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={label ?? ""}
        loading="lazy"
        decoding="async"
        onError={() => setFailedUrl(imageUrl)}
        className={`shrink-0 rounded-full object-cover ${SIZES[size]} ${className}`}
      />
    );
  }

  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`grid shrink-0 place-items-center rounded-full font-bold ${SIZES[size]} ${
        pending ? "border-2 border-dashed border-muted/70 text-muted" : "text-background"
      } ${className}`}
      style={pending ? undefined : { backgroundColor: getAvatarColor(userId) }}
    >
      {getInitials(name)}
    </span>
  );
}
