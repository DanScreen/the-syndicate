import { SiteHeader } from "@/components/header";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-16">
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-accent">
            Social group accas
          </p>
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">
            Build accas together. Compete on every leg.
          </h1>
          <p className="mt-6 text-lg text-muted">
            The Syndicate lets football fans create groups where each member contributes
            one leg. Track group performance, compare individual results, and get the
            best combined odds across bookmakers.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/sign-up"
              className="rounded-lg bg-accent px-5 py-2.5 font-medium text-black hover:bg-green-400"
            >
              Start a syndicate
            </Link>
            <Link
              href="/sign-in"
              className="rounded-lg border border-border px-5 py-2.5 font-medium hover:bg-card"
            >
              Sign in
            </Link>
          </div>
        </div>

        <section className="mt-20 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Group accas",
              body: "Each member picks one leg. When everyone submits, the acca locks automatically.",
            },
            {
              title: "Best odds",
              body: "We compare bookmaker prices and link you to a pre-populated betslip.",
            },
            {
              title: "Leaderboards",
              body: "Track who lands the most legs and how your syndicate performs over time.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm text-muted">{item.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
