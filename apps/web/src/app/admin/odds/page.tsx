import type { Metadata } from "next";
import { AdminOddsDiagnosticsPanel } from "@/components/admin-odds-diagnostics";
import { AdminPageShell } from "@/components/admin-page-shell";

export const metadata: Metadata = {
  title: "Odds diagnostics",
  robots: { index: false, follow: false },
};

export default function AdminOddsDiagnosticsPage() {
  return (
    <AdminPageShell
      title="Odds Diagnostics"
      description="Probe The Odds API and see how many fixtures survive each filter step."
      path="/admin/odds"
    >
      <AdminOddsDiagnosticsPanel />
    </AdminPageShell>
  );
}
