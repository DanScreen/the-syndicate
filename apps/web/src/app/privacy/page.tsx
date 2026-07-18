import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "Privacy Notice",
  description:
    "How Tiki Acca collects, uses, and protects your personal data, and the rights you have.",
};

export default function PrivacyPage() {
  return (
    <MarketingShell path="/privacy">
      <div className="marketing-gradient border-b border-border/60">
        <div className="mx-auto max-w-3xl px-4 py-16 md:py-24">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
            Legal
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">
            Privacy Notice
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            How we collect, use, and protect your personal data — and the rights
            you have over it.
          </p>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 py-16">
        <section className="prose prose-invert max-w-none">
          <p className="mt-4 leading-relaxed text-muted">
            Tiki Acca (&ldquo;Tiki Acca&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;)
            is a social tool that helps groups coordinate accumulator
            (&ldquo;acca&rdquo;) ideas. <strong className="text-foreground">We do not
            take bets, hold funds, or act as a bookmaker</strong> — you place any
            bets directly with licensed bookmakers.
          </p>
          <p className="mt-4 leading-relaxed text-muted">
            Tiki Acca is the controller of your personal data. For any privacy
            query, contact us at{" "}
            <a href="mailto:tikiacca@outlook.com" className="text-accent hover:underline">
              tikiacca@outlook.com
            </a>
            .
          </p>

          <h2 className="mt-12 font-display text-2xl font-bold">
            What we collect and why
          </h2>
          <p className="mt-4 leading-relaxed text-muted">
            When you create an account you provide your{" "}
            <strong className="text-foreground">first and last name</strong> (used
            to identify you to your group, on leaderboards, picks, and emails),
            your <strong className="text-foreground">email address</strong> (for
            sign-in, account security, and service notifications), a{" "}
            <strong className="text-foreground">password</strong> (stored only as a
            salted hash, never in plain text), and your{" "}
            <strong className="text-foreground">date of birth</strong> (to verify
            you are 18 or over, as this is an adults-only service).
          </p>
          <p className="mt-4 leading-relaxed text-muted">
            As you use Tiki Acca we also process the groups you own or belong to
            and your role in them, the accumulator picks you submit and their
            outcomes, your points and performance statistics, your notification
            preferences, and — if you use the mobile app — a device push token so
            we can send the notifications you have opted into.
          </p>
          <p className="mt-4 leading-relaxed text-muted">
            Our lawful bases (UK/EU GDPR) are performance of our contract with you
            for account and gameplay data, a legal obligation and our legitimate
            interests for age verification, and our legitimate interests in
            maintaining and improving the service for analytics.
          </p>

          <h2 className="mt-12 font-display text-2xl font-bold">Analytics</h2>
          <p className="mt-4 leading-relaxed text-muted">
            We record basic in-app events — the event type, the associated account
            (when you are signed in), and the page path — in our own database to
            understand how the product is used and improve it. This is{" "}
            <strong className="text-foreground">first-party and cookieless</strong>:
            we do not use third-party analytics, advertising pixels, or social-media
            trackers.
          </p>

          <h2 className="mt-12 font-display text-2xl font-bold">
            What we do not do
          </h2>
          <ul className="mt-4 space-y-2 text-muted">
            <li>We do not use third-party analytics, advertising, or tracking.</li>
            <li>We do not sell your personal data.</li>
            <li>
              We do not take bets or process payments, so we hold no financial or
              payment-card data.
            </li>
          </ul>

          <h2 className="mt-12 font-display text-2xl font-bold">
            Who we share data with
          </h2>
          <p className="mt-4 leading-relaxed text-muted">
            We share personal data only with service providers who help us run Tiki
            Acca and act on our instructions — such as our hosting and infrastructure
            providers, our email provider, and, for the mobile app, push-notification
            delivery. We may also disclose data where required by law. Where any of
            these providers process data outside the UK/EEA, we rely on appropriate
            safeguards such as the UK International Data Transfer Agreement or EU
            Standard Contractual Clauses.
          </p>

          <h2 className="mt-12 font-display text-2xl font-bold">
            How long we keep it
          </h2>
          <p className="mt-4 leading-relaxed text-muted">
            We keep your account data for as long as your account is active. If you
            delete your account, we delete or anonymise your personal data within a
            reasonable period afterwards, except where we must retain limited records
            to meet a legal obligation.
          </p>

          <h2 className="mt-12 font-display text-2xl font-bold">Your Rights</h2>
          <p className="mt-4 leading-relaxed text-muted">
            Under UK/EU GDPR you have the right to access, correct, delete, or port
            your data, to object to or restrict certain processing, and to withdraw
            consent where we rely on it. To exercise any of these, contact{" "}
            <a href="mailto:tikiacca@outlook.com" className="text-accent hover:underline">
              tikiacca@outlook.com
            </a>
            . You can also complain to the UK Information Commissioner&rsquo;s Office
            (
            <a
              href="https://ico.org.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              ico.org.uk
            </a>
            ) or your local supervisory authority.
          </p>

          <h2 className="mt-12 font-display text-2xl font-bold">Children</h2>
          <p className="mt-4 leading-relaxed text-muted">
            Tiki Acca is strictly for adults aged 18 and over. We collect date of
            birth at sign-up and block anyone under 18. If you believe someone under
            18 has created an account, contact{" "}
            <a href="mailto:tikiacca@outlook.com" className="text-accent hover:underline">
              tikiacca@outlook.com
            </a>{" "}
            and we will remove it.
          </p>

          <h2 className="mt-12 font-display text-2xl font-bold">Cookies</h2>
          <p className="mt-4 leading-relaxed text-muted">
            We use only strictly necessary cookies to keep you signed in. See our{" "}
            <Link href="/cookies" className="text-accent hover:underline">
              Cookie Notice
            </Link>{" "}
            for details.
          </p>

          <h2 className="mt-12 font-display text-2xl font-bold">
            Changes to this notice
          </h2>
          <p className="mt-4 leading-relaxed text-muted">
            We may update this notice from time to time. Material changes will be
            highlighted in the app or by email.
          </p>
        </section>
      </article>
    </MarketingShell>
  );
}
