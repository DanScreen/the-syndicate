import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { LogoMark } from "@/components/logo";
import {
  audiences,
  faqs,
  hero,
  howItWorks,
  tagline,
  valueProps,
} from "@/lib/marketing-content";

function Icon({ name }: { name: (typeof valueProps)[number]["icon"] }) {
  const paths: Record<string, string> = {
    users:
      "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    chart: "M3 3v18h18M7 16l4-4 4 4 5-6",
    trophy: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M6 4v5a6 6 0 0 0 12 0V4M12 15v4M8 21h8",
    shield:
      "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  };

  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-accent"
      aria-hidden
    >
      <path d={paths[name]} />
    </svg>
  );
}

export default function HomePage() {
  return (
    <MarketingShell path="/">
      {/* Hero */}
      <section className="marketing-gradient border-b border-border/60">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 md:pb-28 md:pt-24">
          <div className="max-w-3xl">
            <div className="mb-6 flex items-center gap-3">
              <LogoMark size={44} />
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
                {tagline}
              </p>
            </div>
            <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl">
              {hero.headline}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted md:text-xl">
              {hero.subhead}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/sign-up"
                className="rounded-xl bg-accent px-6 py-3 font-medium text-black transition-colors hover:bg-accent-bright"
              >
                Start a syndicate — free
              </Link>
              <Link
                href="/about"
                className="rounded-xl border border-border px-6 py-3 font-medium transition-colors hover:bg-card"
              >
                What is The Syndicate?
              </Link>
            </div>
          </div>

          {/* Product preview mock */}
          <div className="mt-16 overflow-hidden rounded-2xl border border-border bg-card/60 shadow-2xl shadow-black/40">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-accent/70" />
              <span className="ml-2 text-xs text-muted">Saturday Syndicate · Round locked</span>
            </div>
            <div className="grid gap-px bg-border md:grid-cols-3">
              {[
                { who: "Dan", pick: "Arsenal to win", odds: "1.85" },
                { who: "Mike", pick: "Over 2.5 goals", odds: "1.72" },
                { who: "Tom", pick: "BTTS — Yes", odds: "1.65" },
              ].map((leg) => (
                <div key={leg.who} className="bg-card p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    {leg.who}&apos;s leg
                  </p>
                  <p className="mt-2 font-medium">{leg.pick}</p>
                  <p className="mt-1 text-accent">{leg.odds}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border bg-accent-muted/20 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">Combined odds</p>
                <p className="text-2xl font-bold text-accent">5.26</p>
              </div>
              <span className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black">
                Open betslip
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            More than a group chat acca
          </h2>
          <p className="mt-4 text-lg text-muted">
            The Syndicate gives your group structure — live odds, automatic locking, settlement,
            and stats that show who actually knows their football.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {valueProps.map((item) => (
            <div
              key={item.title}
              className="glass-card rounded-2xl border border-border p-6 transition-colors hover:border-accent/30"
            >
              <Icon name={item.icon} />
              <h3 className="mt-4 font-display text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="font-display text-3xl font-bold tracking-tight">How it works</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {howItWorks.map((item) => (
              <div key={item.step}>
                <span className="font-display text-4xl font-bold text-accent/40">{item.step}</span>
                <h3 className="mt-4 font-display text-xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Audiences */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="font-display text-3xl font-bold tracking-tight">Who it&apos;s for</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {audiences.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border bg-card/20">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="font-display text-3xl font-bold tracking-tight">Common questions</h2>
          <dl className="mt-10 grid gap-6 md:grid-cols-2">
            {faqs.map((item) => (
              <div key={item.q} className="rounded-xl border border-border bg-card/50 p-5">
                <dt className="font-medium">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA */}
      <section className="marketing-gradient border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Ready for the next matchday?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Create your syndicate in under a minute. Invite your mates and let everyone pick a leg.
          </p>
          <Link
            href="/sign-up"
            className="mt-8 inline-block rounded-xl bg-accent px-8 py-3.5 font-medium text-black transition-colors hover:bg-accent-bright"
          >
            Get started free
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
