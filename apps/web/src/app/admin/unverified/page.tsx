import { AdminPageShell } from "@/components/admin/page-shell";
import { AdminUnverifiedAccounts } from "@/components/admin/unverified-accounts";
import { computeUnverifiedAccounts } from "@/lib/admin/compute-unverified-accounts";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Unconfirmed accounts",
  robots: { index: false, follow: false },
};

export default async function AdminUnverifiedPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number.parseInt(params.page ?? "1", 10);
  const data = await computeUnverifiedAccounts({
    query: params.q,
    page: Number.isFinite(page) ? page : 1,
  });

  return (
    <AdminPageShell
      title="Unconfirmed Accounts"
      description="Users who haven't confirmed their email address. Fix typo'd addresses, resend links, or remove junk sign-ups."
      path="/admin/unverified"
    >
      <AdminUnverifiedAccounts data={data} />
    </AdminPageShell>
  );
}
