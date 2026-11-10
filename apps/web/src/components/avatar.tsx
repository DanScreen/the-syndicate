import { getAvatarColor, getInitials } from "@tiki-acca/shared";

const SIZES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-11 w-11 text-base",
} as const;

/**
 * Initials on the member's colour (same palette and hash as the mobile app).
 * "pending" draws a dashed ring for someone who hasn't picked yet.
 * Decorative by default: pass `label` only when no name is written alongside.
 */
export function Avatar({
  name,
  userId,
  size = "sm",
  variant = "filled",
  label,
  className = "",
}: {
  name: string;
  userId: string;
  size?: keyof typeof SIZES;
  variant?: "filled" | "pending";
  label?: string;
  className?: string;
}) {
  const pending = variant === "pending";
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
