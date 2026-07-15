import Link from "next/link";

const primaryClass =
  "rounded-xl bg-accent px-6 py-3 font-medium text-black transition-colors hover:bg-accent-bright";
const secondaryClass =
  "rounded-xl border border-border px-6 py-3 font-medium transition-colors hover:bg-card";

/** Hero / footer CTA pair — signed-in users get app entry points, not auth links. */
export function MarketingCtas({
  signedIn,
  primaryHref = "/sign-up",
  primaryLabel = "Sign up",
  secondaryHref = "/sign-in",
  secondaryLabel = "Sign in",
  primaryClassName = primaryClass,
  secondaryClassName = secondaryClass,
}: {
  signedIn: boolean;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
}) {
  if (signedIn) {
    return (
      <>
        <Link href="/dashboard" className={primaryClassName}>
          Go to Groups
        </Link>
        <Link href="/performance" className={secondaryClassName}>
          Performance
        </Link>
      </>
    );
  }

  return (
    <>
      <Link href={primaryHref} className={primaryClassName}>
        {primaryLabel}
      </Link>
      <Link href={secondaryHref} className={secondaryClassName}>
        {secondaryLabel}
      </Link>
    </>
  );
}
