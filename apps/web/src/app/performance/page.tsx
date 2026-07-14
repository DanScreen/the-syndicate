import { AppHeader } from "@/components/header";
import { PageView } from "@/components/analytics/page-view";
import { DashboardStats } from "@/components/dashboard-stats";
import { auth } from "@/lib/auth";
import { greetingFirstName } from "@/lib/user-display";
import { redirect } from "next/navigation";

export default async function PerformancePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const firstName = greetingFirstName(session.user);

  return (
    <div className="min-h-screen">
      <PageView path="/performance" userId={session.user.id} />
      <AppHeader userName={firstName} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold">Your performance</h1>
        <p className="mt-1 text-sm text-muted">
          Cross-group stats, charts, and share cards.
        </p>
        <DashboardStats userName={firstName} />
      </main>
    </div>
  );
}
