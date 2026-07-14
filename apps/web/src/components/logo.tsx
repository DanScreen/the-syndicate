import Link from "next/link";

type LogoProps = {
  className?: string;
  showWordmark?: boolean;
  href?: string;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: { mark: 28, text: "text-base" },
  md: { mark: 32, text: "text-lg" },
  lg: { mark: 40, text: "text-xl" },
};

function MarkStack() {
  return (
    <>
      <rect width="40" height="40" rx="10" className="fill-accent-muted/60" />
      <rect x="10" y="11" width="20" height="4" rx="1.5" className="fill-accent" />
      <rect x="10" y="18" width="16" height="4" rx="1.5" className="fill-accent/80" />
      <rect x="10" y="25" width="12" height="4" rx="1.5" className="fill-accent/55" />
    </>
  );
}

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
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
      <MarkStack />
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
      <Link href={href} className="transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
