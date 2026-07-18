import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";

// Deliberately unlinked from site navigation — this page exists as the App
// Store Support URL and for direct reference from support replies.
export const metadata: Metadata = {
  title: "Support",
  description: "Get help with Tiki Acca — contact, common questions, and account issues.",
};

export default function SupportPage() {
  return (
    <MarketingShell path="/support">
      <div className="marketing-gradient border-b border-border/60">
        <div className="mx-auto max-w-3xl px-4 py-16 md:py-24">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
            Support
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">
            Need A Hand?
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            We read everything. Email us and a human will get back to you,
            usually within two working days.
          </p>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 py-16">
        <section className="rounded-2xl border border-accent/30 bg-accent-muted/20 p-6">
          <h2 className="font-display text-xl font-semibold">Contact Us</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Email{" "}
            <a
              href="mailto:tikiacca@outlook.com"
              className="font-medium text-accent hover:underline"
            >
              tikiacca@outlook.com
            </a>{" "}
            for anything — bugs, questions, feedback, or account help. It helps
            to include the email address on your Tiki Acca account and, for
            bugs, what you tapped and what you expected to happen.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold">Quick Answers</h2>
          <dl className="mt-4 space-y-5 text-sm leading-relaxed">
            <div>
              <dt className="font-medium text-foreground">
                How do I report a chat message or block someone?
              </dt>
              <dd className="mt-1 text-muted">
                Long-press any message in the group chat to report it to us or
                to block that member. Manage blocked members under Account.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">
                How do I delete my account?
              </dt>
              <dd className="mt-1 text-muted">
                Account → Delete account (in the app or on the website). Your
                personal details are removed permanently; this can&apos;t be
                undone.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">
                A result or odds look wrong
              </dt>
              <dd className="mt-1 text-muted">
                Odds and results come from data providers and can briefly lag
                the real world. If something still looks wrong after settlement,
                email us with the group name and the fixture.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">
                Did my group&apos;s bet get placed?
              </dt>
              <dd className="mt-1 text-muted">
                Tiki Acca never places bets. If your group backed the acca for
                real, the bet lives with the bookmaker it was placed at — check
                your account there.
              </dd>
            </div>
          </dl>
        </section>

        <section className="mt-10 border-t border-border pt-8 text-sm text-muted">
          <p>
            See also our{" "}
            <Link href="/terms" className="text-accent hover:underline">
              Terms of Service
            </Link>
            ,{" "}
            <Link href="/privacy" className="text-accent hover:underline">
              Privacy Notice
            </Link>{" "}
            and{" "}
            <Link href="/cookies" className="text-accent hover:underline">
              Cookie Notice
            </Link>
            . 18+. If gambling stops being fun, free and confidential support is
            available at{" "}
            <a
              href="https://www.begambleaware.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              BeGambleAware.org
            </a>
            .
          </p>
        </section>
      </article>
    </MarketingShell>
  );
}
