"use client";

import { apiFetcher } from "@/lib/api-client";
import { useBlockedMembers } from "@tiki-acca/client";
import { copy } from "@tiki-acca/shared";

export function BlockedMembers() {
  const { blocked, loading, error, unblock } = useBlockedMembers(apiFetcher);

  if (loading) return null;

  return (
    <section className="mt-10 border-t border-border pt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        {copy.blockedMembers.title}
      </h2>
      <p className="mt-2 text-sm text-muted">
        You won&apos;t see chat messages from blocked members.
      </p>
      {blocked.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{copy.blockedMembers.empty}</p>
      ) : (
        <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
          {blocked.map((member) => (
            <li key={member.userId} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="font-medium">{member.name}</span>
              <button
                type="button"
                onClick={() => void unblock(member.userId)}
                className="text-sm font-medium text-accent hover:text-accent-bright"
              >
                {copy.blockedMembers.unblock}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </section>
  );
}
