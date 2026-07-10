import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminStats } from "@/components/admin-stats";
import { computeAdminStats } from "@/lib/admin/compute-admin-stats";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin overview",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const stats = await computeAdminStats();

  return (
    <AdminPageShell
      title="Platform overview"
      description="Product metrics from the database and lightweight analytics events."
      path="/admin"
    >
      <AdminStats stats={stats} />
    </AdminPageShell>
  );
}
