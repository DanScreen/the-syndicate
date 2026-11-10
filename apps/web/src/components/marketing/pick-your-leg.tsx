"use client";

import Link from "next/link";
import { useState } from "react";
import { exampleMates, pickOptions, productOdds, signUpHref } from "@/lib/marketing-content";
import { MateAvatar } from "./mate-avatar";

/** Mates whose legs are already in the example slip; the visitor's pick joins them. */
const slipMates = exampleMates;

export function PickYourLeg({ signedIn = false }: { signedIn?: boolean }) {
  const [pickedId, setPickedId] = useState<string | null>(null);
  const picked = pickOptions.find((option) => option.id === pickedId) ?? null;
  const combined = productOdds([
    ...slipMates.map((mate) => mate.odds),
    ...(picked ? [picked.odds] : []),
  ]);

  return (
    <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
      <div>
        <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Go on then. Pick your leg.
        </h2>
        <p className="mt-4 max-w-md text-muted">
          Tap one of these to see how it slots into a slip. Example odds, no account needed.
        </p>
        <div role="group" aria-label="Example selections" className="mt-8 grid gap-3">
          {pickOptions.map((option) => {
            const isPicked = option.id === pickedId;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={isPicked}
                onClick={() => setPickedId(option.id)}
                className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                  isPicked
                    ? "border-accent bg-accent-muted/30 text-foreground"
                    : "border-border bg-card/60 hover:border-accent/40 hover:bg-card"
                }`}
              >
                {option.label} · <span className="tabular-nums text-accent">{option.odds.toFixed(2)}</span>
              </button>
            );
          })}
        </div>
        {picked && (
          <div className="marketing-leg-in mt-8">
            <Link
              href={signedIn ? "/dashboard" : signUpHref}
              className="inline-block rounded-xl bg-accent px-6 py-3 font-medium text-on-accent transition-colors hover:bg-accent-bright"
            >
              {signedIn ? "Go to your groups" : "Now do it with your actual mates"}
            </Link>
          </div>
        )}
      </div>

      <div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xl shadow-black/30">
          <p className="text-xs uppercase tracking-wide text-muted">Example slip</p>
          <ul className="mt-4 flex flex-col gap-2">
            {slipMates.map((mate) => (
              <li
                key={mate.name}
                className="flex items-center gap-3 rounded-xl border border-border bg-background/60 px-3 py-2.5"
              >
                <MateAvatar name={mate.name} color={mate.color} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{mate.selection}</p>
                  <p className="truncate text-[11px] text-muted">
                    {mate.name} · {mate.fixture}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-accent">
                  {mate.odds.toFixed(2)}
                </span>
              </li>
            ))}
            {picked ? (
              <li className="marketing-leg-in flex items-center gap-3 rounded-xl border border-accent/60 bg-accent-muted/30 px-3 py-2.5">
                <MateAvatar name="You" color="var(--accent)" size="sm" />
                <p className="min-w-0 flex-1 text-sm font-semibold">You — {picked.label}</p>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-accent">
                  {picked.odds.toFixed(2)}
                </span>
              </li>
            ) : (
              <li className="flex h-12 items-center gap-3 rounded-xl border border-dashed border-border px-3 text-xs text-muted">
                <span className="h-7 w-7 shrink-0 rounded-full border border-dashed border-muted/60" />
                Your leg
              </li>
            )}
          </ul>
          <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
            <p className="text-xs uppercase tracking-wide text-muted">Combined odds (example)</p>
            <p className="text-2xl font-bold tabular-nums text-accent" aria-live="polite">
              {combined}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">Example odds. Tiki Acca is not a bookmaker.</p>
      </div>
    </div>
  );
}
