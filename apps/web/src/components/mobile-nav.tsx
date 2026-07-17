"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

type MobileNavLink = {
  href: string;
  label: string;
  active?: boolean;
  emphasis?: "accent" | "muted";
};

type MobileNavProps = {
  links: MobileNavLink[];
  /** Optional trailing block inside the panel (e.g. account link). */
  footer?: ReactNode;
  /** Always-visible compact actions beside the menu button (e.g. Sign up). */
  trailing?: ReactNode;
};

function linkClass(active: boolean, emphasis?: MobileNavLink["emphasis"]) {
  if (emphasis === "accent") {
    return "block rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-black hover:bg-accent-bright";
  }
  return `block rounded-lg px-3 py-2.5 text-sm transition-colors ${
    active
      ? "bg-accent-muted/40 text-accent"
      : "text-muted hover:bg-card hover:text-foreground"
  }`;
}

export function MobileNav({ links, footer, trailing }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (target && rootRef.current && !rootRef.current.contains(target)) {
        close();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open, close]);

  return (
    <div ref={rootRef} className="relative flex items-center gap-2 md:hidden">
      {trailing}
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-card"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>

      {open ? (
        <div
          id={panelId}
          role="navigation"
          aria-label="Site"
          className="absolute right-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-border bg-card/95 p-2 shadow-lg backdrop-blur-md"
        >
          <ul className="flex flex-col gap-0.5">
            {links.map((link) => (
              <li key={`${link.href}-${link.label}`}>
                <Link
                  href={link.href}
                  className={linkClass(Boolean(link.active), link.emphasis)}
                  onClick={close}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          {footer ? (
            <div className="mt-1 border-t border-border pt-1">{footer}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M3 5h14M3 10h14M3 15h14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M5 5l10 10M15 5L5 15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
