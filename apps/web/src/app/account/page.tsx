import { DeleteAccount } from "@/components/delete-account";
import { AppHeader } from "@/components/header";
import { NotificationSettings } from "@/components/notification-settings";
import { SignOutButton } from "@/components/sign-out-button";
import { auth } from "@/lib/auth";
import { greetingFirstName } from "@/lib/user-display";
import { redirect } from "next/navigation";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const firstName = greetingFirstName(session.user);
  const fullName = session.user.name?.trim() || firstName;

  return (
    <div className="min-h-screen">
      <AppHeader userName={firstName} />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="font-display text-2xl font-bold">Account</h1>
        <p className="mt-2 text-sm text-muted">
          Your profile and preferences.
        </p>

        <section className="mt-8 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Profile
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Name</dt>
              <dd className="font-medium text-foreground">{fullName}</dd>
            </div>
            {session.user.email ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Email</dt>
                <dd className="font-medium text-foreground">
                  {session.user.email}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section id="notifications" className="mt-10 scroll-mt-24">
          <h2 className="text-xl font-semibold">Notifications</h2>
          <p className="mt-1 text-sm text-muted">
            Email and push alerts for your groups.
          </p>
          <div className="mt-6">
            <NotificationSettings />
          </div>
        </section>

        <section className="mt-10 border-t border-border pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Session
          </h2>
          <p className="mt-2 text-sm text-muted">
            Sign out on this device. You can sign back in anytime.
          </p>
          <div className="mt-4">
            <SignOutButton />
          </div>
        </section>

        <section className="mt-10 border-t border-border pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Delete Account
          </h2>
          <p className="mt-2 text-sm text-muted">
            Permanently removes your personal details from Tiki Acca and signs
            you out everywhere. Group history stays for other members, shown as
            &ldquo;Former member&rdquo;. This can&apos;t be undone.
          </p>
          <div className="mt-4">
            <DeleteAccount />
          </div>
        </section>
      </main>
    </div>
  );
}
