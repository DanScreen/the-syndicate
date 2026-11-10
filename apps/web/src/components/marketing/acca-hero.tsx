"use client";

import { useEffect, useState } from "react";
import { exampleGroupName, exampleMates, productOdds } from "@/lib/marketing-content";
import { MateAvatar } from "./mate-avatar";

const STEP_MS = 1400;
const LEG_COUNT = exampleMates.length;
/** Step on which the acca locks, once every leg has dropped in (steps 1..LEG_COUNT). */
const LOCK_STEP = LEG_COUNT + 1;
/** Step on which the result banner and the first chat bubble appear, after every leg settles. */
const BANNER_STEP = LOCK_STEP + LEG_COUNT + 1;
/** Final frame: all legs in, the acca is locked and settled, and Tom let it down. */
const FINAL_STEP = BANNER_STEP + 1;
/** The loop holds on the final frame for three steps. */
const CYCLE_LENGTH = FINAL_STEP + 3;
/** Index of the one leg that loses (Tom). */
const LOSING_INDEX = exampleMates.findIndex((mate) => mate.name === "Tom");
const LOSER_NAME = exampleMates[LOSING_INDEX].name;
/** Ring positions (percent of the wrapper), clockwise from the top, matching exampleMates order: a triangle, like the rondo logo. */
const RING_POSITIONS = [
  { left: "50%", top: "1%" },
  { left: "90%", top: "82%" },
  { left: "10%", top: "82%" },
] as const;

type LegResult = "won" | "lost" | null;

export function AccaHero() {
  // Server render and reduced-motion users get the finished slip; the loop starts after mount.
  const [step, setStep] = useState(FINAL_STEP);

  useEffect(() => {
    let reducedMotion = false;
    try {
      reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      reducedMotion = false;
    }
    if (reducedMotion) return;
    setStep(0);
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setStep((current) => (current + 1) % CYCLE_LENGTH);
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, []);

  const legsIn = step >= 1 ? Math.min(step, exampleMates.length) : 0;
  const locked = step >= LOCK_STEP;
  const settled = step > LOCK_STEP ? Math.min(step - LOCK_STEP, LEG_COUNT) : 0;
  const showBanner = step >= BANNER_STEP;
  const showMattyBubble = step >= BANNER_STEP;
  const showTomBubble = step >= FINAL_STEP;
  const dropping = step >= 1 && step <= exampleMates.length ? step - 1 : -1;
  const combined =
    legsIn > 0 ? productOdds(exampleMates.slice(0, legsIn).map((mate) => mate.odds)) : "—";

  function resultFor(index: number): LegResult {
    if (index >= settled) return null;
    return index === LOSING_INDEX ? "lost" : "won";
  }

  return (
    <div className="relative mx-auto w-full max-w-[18.5rem] md:max-w-none md:py-14">
      <div aria-hidden="true">
        {/* Decorative rondo ring (md+) */}
        <svg
          className="pointer-events-none absolute inset-0 hidden h-full w-full text-accent/35 md:block"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {RING_POSITIONS.map((from, index) => {
            const to = RING_POSITIONS[(index + 1) % RING_POSITIONS.length];
            return (
              <line
                key={exampleMates[index].name}
                x1={parseFloat(from.left)}
                y1={parseFloat(from.top)}
                x2={parseFloat(to.left)}
                y2={parseFloat(to.top)}
                stroke="currentColor"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
        {exampleMates.map((mate, index) => (
          <div
            key={mate.name}
            className="absolute hidden -translate-x-1/2 -translate-y-1/2 transition-all duration-300 md:block"
            style={RING_POSITIONS[index]}
          >
            <MateAvatar
              name={mate.name}
              color={mate.color}
              className={
                dropping === index
                  ? "scale-110 ring-2 ring-accent shadow-[0_0_24px_rgba(56,189,248,0.8)]"
                  : "opacity-80"
              }
            />
          </div>
        ))}

        {/* Phone frame: fixed height so nothing shifts while the demo runs */}
        <div className="relative z-10 mx-auto flex h-[33rem] w-full max-w-[18.5rem] flex-col rounded-[2.5rem] border border-border bg-card p-2 shadow-2xl shadow-black/50 md:max-w-[20rem]">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] bg-background">
            <div className="flex h-7 shrink-0 items-center justify-center">
              <span className="h-4 w-24 rounded-full bg-black/80" />
            </div>

            <div className="flex h-12 shrink-0 items-center justify-between gap-2 px-4">
              <p className="truncate font-display text-base font-semibold">{exampleGroupName}</p>
              <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                Example group
              </span>
            </div>

            <div className="flex h-14 shrink-0 items-center justify-between px-4">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted">Combined odds</p>
                <p className="text-[10px] text-muted/80">Example</p>
              </div>
              <p className="text-3xl font-bold tabular-nums text-accent">{combined}</p>
            </div>

            <ul className="flex flex-col gap-1.5 px-4">
              {exampleMates.map((mate, index) => {
                const legVisible = index < legsIn;
                if (!legVisible) {
                  return (
                    <li
                      key={mate.name}
                      className="flex h-12 items-center gap-3 rounded-xl border border-dashed border-border px-3 text-xs text-muted"
                    >
                      <span className="h-7 w-7 shrink-0 rounded-full border border-dashed border-muted/60" />
                      Waiting on {mate.name}
                    </li>
                  );
                }
                const result = resultFor(index);
                const edge =
                  result === "won"
                    ? "border-l-success-strong"
                    : result === "lost"
                      ? "border-l-danger-strong"
                      : "border-l-accent";
                return (
                  <li
                    key={mate.name}
                    className={`marketing-leg-in flex h-12 items-center gap-2.5 rounded-xl border border-border border-l-4 bg-background/60 px-3 ${edge}`}
                  >
                    <MateAvatar name={mate.name} color={mate.color} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold leading-tight">{mate.selection}</p>
                      <p className="truncate text-[11px] text-muted">
                        {mate.name} · {mate.fixture}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-accent-muted/50 px-2 py-0.5 text-xs font-semibold tabular-nums text-accent">
                      {mate.odds.toFixed(2)}
                    </span>
                    {result === "won" && (
                      <span className="marketing-pop grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                      </span>
                    )}
                    {result === "lost" && (
                      <span className="marketing-pop grid h-5 w-5 shrink-0 place-items-center rounded-full bg-danger/15 text-danger">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="flex h-10 shrink-0 items-center justify-center px-4">
              {showBanner ? (
                <p key="result" className="marketing-leg-in rounded-full bg-card px-3 py-1 text-center text-xs font-semibold">
                  {LEG_COUNT - 1} of {LEG_COUNT} landed. {LOSER_NAME} let the acca down.
                </p>
              ) : locked ? (
                <p key="locked" className="marketing-leg-in rounded-full bg-accent-muted/50 px-3 py-1 text-xs font-semibold text-accent">
                  Locked · best odds found
                </p>
              ) : null}
            </div>

            <div className="flex h-24 shrink-0 flex-col justify-end gap-1.5 px-4 pb-3">
              {showMattyBubble && (
                <p className="marketing-leg-in self-start rounded-2xl rounded-tl-sm bg-card px-3 py-1.5 text-xs">
                  <span className="font-semibold text-muted">Matty: </span>
                  TOM. Every. Single. Week.
                </p>
              )}
              {showTomBubble && (
                <p className="marketing-leg-in self-end rounded-2xl rounded-tr-sm bg-accent-muted/60 px-3 py-1.5 text-xs">
                  <span className="font-semibold text-muted">Tom: </span>
                  Villa parked the bus, not my fault 😭
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="sr-only">
        Example animation: Dan, Matty and Tom each add one leg to a group acca, the combined odds build to
        {productOdds(exampleMates.map((mate) => mate.odds))} and lock at the best price, then two legs land and Tom&apos;s loses.
      </p>
    </div>
  );
}
