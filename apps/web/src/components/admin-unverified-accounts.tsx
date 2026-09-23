import { AdminUnverifiedUserActions } from "@/components/admin-unverified-user-actions";
import type { UnverifiedAccountsResult } from "@/lib/admin/compute-unverified-accounts";
import Link from "next/link";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/London",
});

function formatDate(value: Date | null): string {
  return value ? dateFormatter.format(value) : "Never";
}

function pageHref(data: UnverifiedAccountsResult, page: number): string {
  const params = new URLSearchParams();
  if (data.query) params.set("q", data.query);
  params.set("page", String(page));
  return `/admin/unverified?${params.toString()}`;
}

export function AdminUnverifiedAccounts({ data }: { data: UnverifiedAccountsResult }) {
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
          <button
            className="rounded-lg bg-accent px-4 py-2 font-semibold text-background"
            type="submit"
          >
            Search
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">Unconfirmed accounts</h2>
          <p className="mt-1 text-sm text-muted">
            {data.total} account{data.total === 1 ? "" : "s"}. These users can sign in but are held
            on the confirm-email screen and get no notification emails. Removing a user takes them
            out of every group; accounts with no legs or chat are deleted outright, others become
            &ldquo;Former member&rdquo;.
          </p>
        </div>

        {data.users.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted">No unconfirmed accounts.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="whitespace-nowrap px-4 py-3 font-medium">User</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Joined</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Last link sent</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Groups</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <tr className="border-b border-border/60 align-top last:border-0" key={user.userId}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted">{user.email}</p>
                      {!user.domainAcceptsMail && (
                        <p className="mt-1 text-xs font-medium text-danger-strong">
                          Domain can&apos;t receive mail
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {formatDate(user.joinedAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {formatDate(user.lastLinkSentAt)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {user.groups.length === 0
                        ? "None"
                        : user.groups.map((group) => group.name).join(", ")}
                      {user.legCount > 0 && (
                        <p className="text-xs">
                          {user.legCount} leg{user.legCount === 1 ? "" : "s"}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <AdminUnverifiedUserActions
                        email={user.email}
                        groupCount={user.groups.length}
                        legCount={user.legCount}
                        name={user.name}
                        userId={user.userId}
                      />
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
                href={pageHref(data, data.page - 1)}
              >
                Previous
              </Link>
            ) : null}
            {data.page < data.totalPages ? (
              <Link
                className="rounded-lg border border-border px-3 py-1.5 hover:border-accent"
                href={pageHref(data, data.page + 1)}
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
