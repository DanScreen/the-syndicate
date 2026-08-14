import type { Metadata } from "next";
import { AdminEstimatedOddsToggle } from "@/components/admin-estimated-odds-toggle";
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
      description="Warm DB odds snapshots for enabled competitions, or probe The Odds API pipeline."
      path="/admin/odds"
    >
      <div className="space-y-6">
        <AdminEstimatedOddsToggle />
        <AdminOddsDiagnosticsPanel />
      </div>
    </AdminPageShell>
  );
}
