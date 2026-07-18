import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that apply when you use Tiki Acca — eligibility, group chat rules, and what we are (and aren't) responsible for.",
};

const sectionClass = "mt-10";
const headingClass = "font-display text-xl font-semibold";
const bodyClass = "mt-3 text-sm leading-relaxed text-muted";

export default function TermsPage() {
  return (
    <MarketingShell path="/terms">
      <div className="marketing-gradient border-b border-border/60">
        <div className="mx-auto max-w-3xl px-4 py-16 md:py-24">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
            Legal
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">
            Terms of Service
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            The short version: be 18+, keep the chat friendly, and remember we
            keep score — licensed bookmakers take bets, not us.
          </p>
          <p className="mt-4 text-xs text-muted">Last updated: 18 July 2026</p>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 py-16">
        <section>
          <h2 className={headingClass}>1. What Tiki Acca Is</h2>
          <p className={bodyClass}>
            Tiki Acca is a social score-keeping service for groups of friends who
            follow football. Members each pick one leg of a shared accumulator;
            we show live odds, track results, and keep leaderboards. We are{" "}
            <strong className="text-foreground">not a bookmaker</strong>: we never
            accept, place, or process bets or payments. Links to place real bets
            open the websites or apps of independent, licensed UK bookmakers, and
            any bet you place there is a contract between you and that bookmaker,
            on their terms.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={headingClass}>2. Eligibility</h2>
          <p className={bodyClass}>
            You must be at least 18 years old and resident in the United Kingdom
            to use Tiki Acca. We verify your date of birth at sign-up and may
            suspend accounts we reasonably believe belong to under-18s. Gambling
            should be fun — if it stops being fun, visit{" "}
            <a
              href="https://www.begambleaware.org"
              className="text-accent hover:underline"
              rel="noopener noreferrer"
              target="_blank"
            >
              BeGambleAware.org
            </a>{" "}
            for free, confidential support.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={headingClass}>3. Your Account</h2>
          <p className={bodyClass}>
            Keep your password private; you&apos;re responsible for activity on
            your account. You can delete your account at any time from the
            Account screen in the app or on the website — your personal details
            are permanently removed, while group history remains for other
            members under &ldquo;Former member&rdquo;.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={headingClass}>4. Group Chat Rules</h2>
          <p className={bodyClass}>
            Chat is for your group&apos;s picks, banter, and bragging rights.
            Don&apos;t post anything unlawful, threatening, harassing, hateful,
            or that you don&apos;t have the right to share. You can report any
            message for review and block any member from the chat — blocked
            members&apos; messages are hidden from you everywhere. We review
            reports and may remove content or suspend accounts that break these
            rules, at our discretion.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={headingClass}>5. Odds &amp; Results</h2>
          <p className={bodyClass}>
            Odds, fixtures, and results come from third-party providers. We work
            to keep them accurate and timely, but they&apos;re provided &ldquo;as
            is&rdquo; — always confirm odds with the bookmaker before placing a
            bet. Tiki Acca points are for bragging rights only and have no
            monetary value.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={headingClass}>6. Our Liability</h2>
          <p className={bodyClass}>
            Nothing in these terms limits liability that can&apos;t be limited
            under UK law. Beyond that, Tiki Acca is provided free of charge and
            we aren&apos;t liable for losses arising from bets you place with
            bookmakers, from odds or results inaccuracies, or from the service
            being unavailable.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className={headingClass}>7. Changes &amp; Contact</h2>
          <p className={bodyClass}>
            We may update these terms as the product evolves; material changes
            will be flagged in the app. Questions, complaints, or notices:{" "}
            <a
              href="mailto:tikiacca@outlook.com"
              className="text-accent hover:underline"
            >
              tikiacca@outlook.com
            </a>
            . See also our{" "}
            <Link href="/privacy" className="text-accent hover:underline">
              Privacy Notice
            </Link>{" "}
            and{" "}
            <Link href="/cookies" className="text-accent hover:underline">
              Cookie Notice
            </Link>
            .
          </p>
        </section>
      </article>
    </MarketingShell>
  );
}
