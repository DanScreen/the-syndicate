import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "Cookie Notice",
  description:
    "The strictly necessary cookies Tiki Acca uses to keep you signed in, and why we do not show a cookie banner.",
};

type CookieRow = {
  name: string;
  purpose: string;
  duration: string;
};

const COOKIES: CookieRow[] = [
  {
    name: "authjs.session-token",
    purpose: "Keeps you signed in after login (session authentication).",
    duration: "Session / until expiry",
  },
  {
    name: "authjs.csrf-token",
    purpose: "Protects sign-in and account actions against cross-site request forgery.",
    duration: "Session",
  },
  {
    name: "authjs.callback-url",
    purpose: "Returns you to the correct page after signing in.",
    duration: "Session",
  },
];

export default function CookiesPage() {
  return (
    <MarketingShell path="/cookies">
      <div className="marketing-gradient border-b border-border/60">
        <div className="mx-auto max-w-3xl px-4 py-16 md:py-24">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
            Legal
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">
            Cookie Notice
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            We use only the cookies needed to keep you signed in — nothing for
            advertising or tracking.
          </p>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 py-16">
        <section className="prose prose-invert max-w-none">
          <p className="mt-4 leading-relaxed text-muted">
            We use a small number of{" "}
            <strong className="text-foreground">strictly necessary cookies</strong>.
            These are required to sign you in and keep your session secure. Under
            the UK Privacy and Electronic Communications Regulations (PECR) and the
            EU ePrivacy Directive, strictly necessary cookies are exempt from the
            consent requirement, so{" "}
            <strong className="text-foreground">we do not show a cookie consent
            banner</strong>. We do not use analytics, advertising, or tracking
            cookies, and we do not share cookie data with third parties for those
            purposes.
          </p>

          <h2 className="mt-12 font-display text-2xl font-bold">Cookies we set</h2>
        </section>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 pr-4 font-semibold text-foreground">Cookie</th>
                <th className="py-3 pr-4 font-semibold text-foreground">Purpose</th>
                <th className="py-3 font-semibold text-foreground">Duration</th>
              </tr>
            </thead>
            <tbody>
              {COOKIES.map((c) => (
                <tr key={c.name} className="border-b border-border/60 align-top">
                  <td className="py-3 pr-4">
                    <code className="text-accent">{c.name}</code>
                  </td>
                  <td className="py-3 pr-4 text-muted">{c.purpose}</td>
                  <td className="py-3 text-muted">{c.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="prose prose-invert max-w-none">
          <p className="mt-6 text-sm text-muted">
            These cookies are set by our authentication library (Auth.js /
            NextAuth). When served over HTTPS their names carry a{" "}
            <code>__Secure-</code> or <code>__Host-</code> prefix.
          </p>

          <h2 className="mt-12 font-display text-2xl font-bold">Managing cookies</h2>
          <p className="mt-4 leading-relaxed text-muted">
            Because these cookies are essential, disabling them in your browser
            will prevent you from signing in and using your account. Most browsers
            let you view and delete cookies via their settings; signing out also
            clears your session.
          </p>

          <h2 className="mt-12 font-display text-2xl font-bold">Learn more</h2>
          <p className="mt-4 leading-relaxed text-muted">
            For how we handle your personal data more broadly, see our{" "}
            <Link href="/privacy" className="text-accent hover:underline">
              Privacy Notice
            </Link>
            .
          </p>
        </section>
      </article>
    </MarketingShell>
  );
}
