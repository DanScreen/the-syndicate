import { SiteHeader } from "@/components/header";
import { GamblingFooter } from "@/components/site-footer";
import Link from "next/link";

const steps = [
  {
    step: "1",
    title: "Create your syndicate",
    body: "Start a group for your mates and share an invite link in the group chat.",
  },
  {
    step: "2",
    title: "Everyone picks a leg",
    body: "Each member chooses one selection from live football markets and odds.",
  },
  {
    step: "3",
    title: "Lock in and compete",
    body: "When all legs are in, the acca locks. Track results and climb the leaderboard.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto flex-1 max-w-5xl px-4 py-16">
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
            best combined odds across UK bookmakers.
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

        <section className="mt-20">
          <h2 className="text-lg font-semibold">How it works</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {steps.map((item) => (
              <div key={item.step} className="rounded-xl border border-border bg-card p-6">
                <span className="text-sm font-medium text-accent">Step {item.step}</span>
                <h3 className="mt-2 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Group accas",
              body: "Each member picks one leg. When everyone submits, the acca locks automatically.",
            },
            {
              title: "Best odds",
              body: "We compare UK bookmaker prices and link you to place the acca.",
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
      <GamblingFooter />
    </div>
  );
}
