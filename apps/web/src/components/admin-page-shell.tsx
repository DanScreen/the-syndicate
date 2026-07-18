import { redirect } from "next/navigation";
import { AppHeader } from "@/components/header";
import { AdminNav } from "@/components/admin-nav";
import { requireAdminPage } from "@/lib/admin";
import { greetingFirstName } from "@/lib/user-display";

export async function AdminPageShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  /** Retained for explicit page identity; global tracking uses the router path. */
  path: string;
  children: React.ReactNode;
}) {
  const { session, redirect: redirectTo } = await requireAdminPage();
  if (redirectTo) redirect(redirectTo);

  return (
    <div className="min-h-screen">
      <AppHeader userName={greetingFirstName(session!.user ?? {})} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <AdminNav />
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-accent">Admin</p>
          <h1 className="mt-1 text-2xl font-bold">{title}</h1>
          {description && <p className="mt-2 text-sm text-muted">{description}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}
