import { auth } from "@/lib/auth";
import { AccaHero } from "@/components/marketing/acca-hero";
import { BanterStrip } from "@/components/marketing/banter-strip";
import { MarketingCtas } from "@/components/marketing/marketing-ctas";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { PickYourLeg } from "@/components/marketing/pick-your-leg";
import { ScrollStory } from "@/components/marketing/scroll-story";
import { StickyMobileCta } from "@/components/marketing/sticky-mobile-cta";
import { faqs, hero } from "@/lib/marketing-content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

export default async function HomePage() {
  const session = await auth();
  const signedIn = Boolean(session?.user?.id);

  return (
    <MarketingShell path="/">
      {/* Hero */}
      <section className="marketing-gradient border-b border-border/60">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-16 md:pb-28 md:pt-24 lg:grid-cols-2 lg:gap-16">
          <div>
            <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl">
              {hero.headline}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted md:text-xl">
              {hero.subhead}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <MarketingCtas signedIn={signedIn} />
            </div>
            <p className="mt-6 text-xs uppercase tracking-wide text-muted">{hero.compliance}</p>
          </div>
          <div className="min-w-0">
            <AccaHero />
          </div>
        </div>
      </section>

      {/* Scroll story */}
      <ScrollStory />

      {/* Playable demo */}
      <section className="border-y border-border bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <PickYourLeg />
        </div>
      </section>

      {/* Banter */}
      <BanterStrip />

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-20">
        <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Common Questions
        </h2>
        <div className="mt-10 flex flex-col gap-3">
          {faqs.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-border bg-card/50 px-5 py-4 open:bg-card"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                <span>{item.q}</span>
                <span
                  aria-hidden="true"
                  className="text-xl leading-none text-accent transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="marketing-gradient border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Ready For The Next Matchday?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            One Leg Each. Best Odds Locked. Bragging Rights Forever.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <MarketingCtas
              signedIn={signedIn}
              primaryClassName="rounded-xl bg-accent px-8 py-3.5 font-medium text-on-accent transition-colors hover:bg-accent-bright"
              secondaryClassName="rounded-xl border border-border px-8 py-3.5 font-medium transition-colors hover:bg-card"
            />
          </div>
          <p className="mx-auto mt-6 max-w-xl text-xs text-muted">
            We&apos;re not a bookmaker. You bet with licensed UK bookmakers; we keep the score. 18+
          </p>
        </div>
      </section>

      <StickyMobileCta />
    </MarketingShell>
  );
}
