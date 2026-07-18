import type {
  UserActivityResult,
  UserActivitySort,
} from "@/lib/admin/compute-user-activity";
import Link from "next/link";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/London",
});

function formatDate(value: Date | null): string {
  return value ? dateFormatter.format(value) : "Never";
}

function activityHref(
  data: UserActivityResult,
  overrides: Partial<{
    page: number;
    sort: UserActivitySort;
    direction: "asc" | "desc";
  }>
): string {
  const params = new URLSearchParams();
  if (data.query) params.set("q", data.query);
  if (data.channel !== "all") params.set("channel", data.channel);
  params.set("page", String(overrides.page ?? data.page));
  params.set("sort", overrides.sort ?? data.sort);
  params.set("direction", overrides.direction ?? data.direction);
  return `/admin/activity?${params.toString()}`;
}

function SortHeader({
  data,
  sort,
  children,
}: {
  data: UserActivityResult;
  sort: UserActivitySort;
  children: React.ReactNode;
}) {
  const active = data.sort === sort;
  const nextDirection = active && data.direction === "desc" ? "asc" : "desc";
  return (
    <th className="whitespace-nowrap px-4 py-3 font-medium">
      <Link
        className={active ? "text-accent" : "hover:text-foreground"}
        href={activityHref(data, { page: 1, sort, direction: nextDirection })}
      >
        {children}
        {active ? (data.direction === "asc" ? " ↑" : " ↓") : null}
      </Link>
    </th>
  );
}

export function AdminUserActivity({ data }: { data: UserActivityResult }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-4">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-end" method="get">
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
              Search users
            </span>
            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
              defaultValue={data.query}
              name="q"
              placeholder="Name or email"
              type="search"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
              Active channel
            </span>
            <select
              className="rounded-lg border border-border bg-background px-3 py-2"
              defaultValue={data.channel}
              name="channel"
            >
              <option value="all">All users</option>
              <option value="web">Web activity</option>
              <option value="mobile">Mobile activity</option>
            </select>
          </label>
          <input name="sort" type="hidden" value={data.sort} />
          <input name="direction" type="hidden" value={data.direction} />
          <button
            className="rounded-lg bg-accent px-4 py-2 font-semibold text-background"
            type="submit"
          >
            Apply
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">Customer activity</h2>
          <p className="mt-1 text-sm text-muted">
            {data.totalUsers} user{data.totalUsers === 1 ? "" : "s"}. Visits begin
            after 30 minutes without activity. Legacy logins predate channel tracking.
          </p>
        </div>

        {data.users.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted">No matching users.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <SortHeader data={data} sort="name">Customer</SortHeader>
                  <SortHeader data={data} sort="joined">Joined</SortHeader>
                  <SortHeader data={data} sort="webLogins">Web logins</SortHeader>
                  <SortHeader data={data} sort="webVisits">Web visits</SortHeader>
                  <SortHeader data={data} sort="webViews">Web views</SortHeader>
                  <SortHeader data={data} sort="mobileLogins">Mobile logins</SortHeader>
                  <SortHeader data={data} sort="mobileVisits">App visits</SortHeader>
                  <SortHeader data={data} sort="mobileViews">Screen views</SortHeader>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Legacy logins</th>
                  <SortHeader data={data} sort="lastLogin">Last login</SortHeader>
                  <SortHeader data={data} sort="lastActive">Last active</SortHeader>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <tr
                    className="border-b border-border/60 last:border-0"
                    key={user.userId}
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted">{user.email}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {formatDate(user.joinedAt)}
                    </td>
                    <td className="px-4 py-3 text-center tabular-nums">{user.webLogins}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{user.webVisits}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{user.webViews}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{user.mobileLogins}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{user.mobileVisits}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{user.mobileViews}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{user.legacyLogins}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {formatDate(user.lastLoginAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {formatDate(user.lastActiveAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border px-5 py-4 text-sm">
          <span className="text-muted">
            Page {data.page} of {data.totalPages}
          </span>
          <div className="flex gap-2">
            {data.page > 1 ? (
              <Link
                className="rounded-lg border border-border px-3 py-1.5 hover:border-accent"
                href={activityHref(data, { page: data.page - 1 })}
              >
                Previous
              </Link>
            ) : null}
            {data.page < data.totalPages ? (
              <Link
                className="rounded-lg border border-border px-3 py-1.5 hover:border-accent"
                href={activityHref(data, { page: data.page + 1 })}
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
