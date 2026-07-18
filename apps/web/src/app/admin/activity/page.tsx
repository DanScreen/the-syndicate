import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminUserActivity } from "@/components/admin-user-activity";
import { computeUserActivity } from "@/lib/admin/compute-user-activity";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customer activity",
  robots: { index: false, follow: false },
};

type ActivitySearchParams = {
  q?: string;
  channel?: string;
  page?: string;
  sort?: string;
  direction?: string;
};

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<ActivitySearchParams>;
}) {
  const params = await searchParams;
  const page = Number.parseInt(params.page ?? "1", 10);
  const data = await computeUserActivity({
    query: params.q,
    channel: params.channel,
    page: Number.isFinite(page) ? page : 1,
    sort: params.sort,
    direction: params.direction,
  });

  return (
    <AdminPageShell
      title="Customer Activity"
      description="Account-level login, visit and page activity across web and mobile."
      path="/admin/activity"
    >
      <AdminUserActivity data={data} />
    </AdminPageShell>
  );
}
