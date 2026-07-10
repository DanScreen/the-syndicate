import { AppHeader } from "@/components/header";
import { PageView } from "@/components/analytics/page-view";
import { formatLegPoints } from "@the-syndicate/shared";
import { auth } from "@/lib/auth";
import { prisma } from "@the-syndicate/database";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, totalPoints: true },
  });

  const memberships = await prisma.groupMember.findMany({
    where: { userId: session.user.id },
    include: {
      group: {
        include: {
          owner: { select: { name: true } },
          _count: { select: { members: true } },
          rounds: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  const isNewUser = memberships.length === 0;

  return (
    <div className="min-h-screen">
      <PageView path="/dashboard" userId={session.user.id} />
      <AppHeader userName={user?.name ?? "Player"} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Your groups</h1>
            <p className="mt-1 text-sm text-muted">
              {memberships.length} group{memberships.length === 1 ? "" : "s"} ·{" "}
              {formatLegPoints(user?.totalPoints ?? 0)} pts total ·{" "}
              <Link href="/performance" className="text-accent hover:underline">
                View performance
              </Link>
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/groups/join"
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-card"
            >
              Join group
            </Link>
            <Link
              href="/groups/create"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-green-400"
            >
              Create group
            </Link>
          </div>
        </div>

        {isNewUser && (
          <section className="mt-8 rounded-xl border border-accent/30 bg-accent-muted/20 p-6">
            <h2 className="font-semibold text-accent">Welcome to The Syndicate</h2>
            <p className="mt-2 text-sm text-muted">
              Get your mates together in three steps:
            </p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted">
              <li>Create a group and share the invite link</li>
              <li>Start a round — each member picks one leg</li>
              <li>When everyone&apos;s in, the acca locks and you get the best combined odds</li>
            </ol>
            <Link
              href="/groups/create"
              className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-green-400"
            >
              Create your first syndicate
            </Link>
          </section>
        )}

        <section className="mt-8">
          {memberships.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted">
              <p>No groups yet.</p>
              <p className="mt-2 text-sm">
                Create a syndicate for your mates or join with an invite code.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {memberships.map((m) => {
                const activeRound = m.group.rounds[0];
                return (
                  <Link
                    key={m.group.id}
                    href={`/groups/${m.group.id}`}
                    className="rounded-xl border border-border bg-card p-5 hover:border-accent/50"
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold">{m.group.name}</h3>
                      <span className="rounded-full bg-accent-muted px-2 py-0.5 text-xs text-accent capitalize">
                        {m.group.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted">
                      {m.group._count.members} members · Owner: {m.group.owner.name}
                    </p>
                    <p className="mt-1 text-sm">Your points: {formatLegPoints(m.points)}</p>
                    {activeRound && activeRound.status !== "settled" && (
                      <p className="mt-2 text-xs text-accent capitalize">
                        Active round: {activeRound.status}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
