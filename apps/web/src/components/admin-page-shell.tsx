import { redirect } from "next/navigation";
import { AppHeader } from "@/components/header";
import { AdminNav } from "@/components/admin-nav";
import { PageView } from "@/components/analytics/page-view";
import { requireAdminPage } from "@/lib/admin";

export async function AdminPageShell({
  title,
  description,
  path,
  children,
}: {
  title: string;
  description?: string;
  path: string;
  children: React.ReactNode;
}) {
  const { session, redirect: redirectTo } = await requireAdminPage();
  if (redirectTo) redirect(redirectTo);

  return (
    <div className="min-h-screen">
      <PageView path={path} userId={session!.user?.id} />
      <AppHeader userName={session!.user?.name ?? "Admin"} />
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
