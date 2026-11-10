/** Coloured initials circle for an example mate. Decorative: the name is always written alongside. */
export function MateAvatar({
  name,
  color,
  size = "md",
  className = "",
}: {
  name: string;
  color: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const dimensions = size === "sm" ? "h-7 w-7 text-xs" : "h-10 w-10 text-sm";
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full font-bold text-background ${dimensions} ${className}`}
      style={{ backgroundColor: color }}
    >
      {name.charAt(0)}
    </span>
  );
}
