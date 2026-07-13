import { PageView } from "@/components/analytics/page-view";
import { AppHeader } from "@/components/header";
import { NotificationSettings } from "@/components/notification-settings";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function NotificationsSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const userName = session.user.name ?? "Player";

  return (
    <div className="min-h-screen">
      <PageView path="/settings/notifications" userId={session.user.id} />
      <AppHeader userName={userName} />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="mt-2 text-sm text-muted">
          Email and push alerts for your syndicates.
        </p>
        <div className="mt-8">
          <NotificationSettings />
        </div>
      </main>
    </div>
  );
}
