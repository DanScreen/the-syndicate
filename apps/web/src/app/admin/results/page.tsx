import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminResults } from "@/components/admin-results";
import { computeAdminResultsMatches } from "@/lib/admin/compute-admin-results";
import { RESULT_CONFIRMATION_MS } from "@tiki-acca/shared";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin results",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminResultsPage() {
  const matches = await computeAdminResultsMatches();
  const confirmMins = Math.round(RESULT_CONFIRMATION_MS / 60_000);

  return (
    <AdminPageShell
      title="Match results"
      description={`Override a wrong FT score (locks it against the feed) or correct individual leg outcomes. Auto-settle waits ${confirmMins} minutes after first observing FINISHED so provisional feed scores can correct themselves.`}
      path="/admin/results"
    >
      <AdminResults matches={matches} />
    </AdminPageShell>
  );
}
