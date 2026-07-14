import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { howItWorks } from "@/lib/marketing-content";

export const metadata: Metadata = {
  title: "About",
  description:
    "What The Syndicate is, who it's for, and how social group accumulators work.",
};

export default function AboutPage() {
  return (
    <MarketingShell path="/about">
      <div className="marketing-gradient border-b border-border/60">
        <div className="mx-auto max-w-3xl px-4 py-16 md:py-24">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">About</p>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">
            Football accas, built for groups
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            The Syndicate is a free platform for friend groups who build shared football
            accumulators together. Each member contributes one leg. When everyone has picked,
            the acca locks, odds are compared across UK bookmakers, and you track results and
            performance over time.
          </p>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 py-16">
        <section className="prose prose-invert max-w-none">
          <h2 className="font-display text-2xl font-bold">Why this exists</h2>
          <p className="mt-4 leading-relaxed text-muted">
            If your group already builds a Saturday acca, you know the drill: a betslip
            screenshot in the chat, a spreadsheet nobody updates, and a debate about whose pick
            let everyone down. We built The Syndicate to give that a proper home — structured
            rounds, live odds, automatic settlement, and leaderboards that keep the score. And if
            you&apos;ve never built one together, there&apos;s no better way to start: one leg
            each, live odds, and the score kept for you.
          </p>

          <h2 className="mt-12 font-display text-2xl font-bold">What we are — and what we&apos;re not</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-accent/30 bg-accent-muted/10 p-5">
              <h3 className="font-semibold text-accent">We are</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li>A social coordination tool for group accas</li>
                <li>An odds comparison and stats platform</li>
                <li>Free to use for private friend groups</li>
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-semibold">We are not</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li>A bookmaker or betting operator</li>
                <li>Handling money or placing bets for you</li>
                <li>Offering gambling advice or tips</li>
              </ul>
            </div>
          </div>

          <h2 className="mt-12 font-display text-2xl font-bold">How a round works</h2>
          <ol className="mt-6 space-y-6">
            {howItWorks.map((step) => (
              <li key={step.step} className="flex gap-4">
                <span className="font-display text-2xl font-bold text-accent/50">{step.step}</span>
                <div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <h2 className="mt-12 font-display text-2xl font-bold">Scoring &amp; competition</h2>
          <p className="mt-4 leading-relaxed text-muted">
            Members earn <strong className="text-foreground">unit-stake points</strong> on each
            leg: a win at 2.50 odds scores +1.50 points, a loss costs −1.00, and voids score zero.
            Leaderboards rank members across rounds so you can see who consistently lands winners.
            Groups can mix competitions — one member might pick from the Premier League while
            another picks from the Championship or World Cup.
          </p>

          <h2 className="mt-12 font-display text-2xl font-bold">Responsible gambling</h2>
          <p className="mt-4 leading-relaxed text-muted">
            The Syndicate is for adults who choose to bet responsibly with licensed UK bookmakers.
            We encourage setting limits, never chasing losses, and seeking help if gambling stops
            being fun. Visit{" "}
            <a
              href="https://www.begambleaware.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              BeGambleAware.org
            </a>{" "}
            or call <strong className="text-foreground">0808 8020 133</strong>.
          </p>
        </section>

        <div className="mt-16 rounded-2xl border border-border bg-card p-8 text-center">
          <h2 className="font-display text-2xl font-bold">Start your syndicate</h2>
          <p className="mt-2 text-muted">Free to create a group and invite your mates.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/sign-up"
              className="rounded-xl bg-accent px-6 py-3 font-medium text-black hover:bg-accent-bright"
            >
              Sign up
            </Link>
            <Link
              href="/sign-in"
              className="rounded-xl border border-border px-6 py-3 font-medium hover:bg-background"
            >
              Sign in
            </Link>
          </div>
        </div>
      </article>
    </MarketingShell>
  );
}
