import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminSettlement } from "@/components/admin-settlement";
import {
  computeSettlementQueue,
  OVERDUE_AFTER_HOURS,
} from "@/lib/admin/compute-settlement-queue";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin settlement",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSettlementPage() {
  const rounds = await computeSettlementQueue();

  return (
    <AdminPageShell
      title="Settlement queue"
      description={`Locked rounds awaiting system settlement. Legs still unresolved ${OVERDUE_AFTER_HOURS} hours after kickoff are flagged — settle those rounds manually once you've verified the results.`}
      path="/admin/settlement"
    >
      <AdminSettlement rounds={rounds} />
    </AdminPageShell>
  );
}
