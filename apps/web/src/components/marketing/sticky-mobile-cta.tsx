import Link from "next/link";
import { signUpHref } from "@/lib/marketing-content";

/**
 * Fixed bottom bar on phones only. Homepage body padding (globals.css, keyed on
 * `data-marketing-sticky-cta`) keeps the footer clear of it.
 */
export function StickyMobileCta() {
  return (
    <div
      data-marketing-sticky-cta
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md md:hidden"
    >
      <Link
        href={signUpHref}
        className="block rounded-xl bg-accent px-6 py-3 text-center font-medium text-on-accent transition-colors hover:bg-accent-bright"
      >
        Start a group free
      </Link>
    </div>
  );
}
