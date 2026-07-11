import type { Metadata } from "next";
import { AdminCompetitionsPanel } from "@/components/admin-competitions";
import { AdminPageShell } from "@/components/admin-page-shell";

export const metadata: Metadata = {
  title: "Competitions",
  robots: { index: false, follow: false },
};

export default function AdminCompetitionsPage() {
  return (
    <AdminPageShell
      title="Competitions"
      description="Choose which leagues and tournaments appear in the leg picker for all users."
      path="/admin/competitions"
    >
      <AdminCompetitionsPanel />
    </AdminPageShell>
  );
}
