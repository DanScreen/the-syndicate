"use client";

import { CheckIcon } from "./round-helpers";
import { formatKickoff } from "@tiki-acca/shared";
import type { GroupLeg as Leg, GroupMember as Member } from "@tiki-acca/shared";

export function RoundProgress({
  members,
  legs,
  status,
  firstKickoff,
  legsPerMember = 1,
}: {
  members: Member[];
  legs: Leg[];
  status: string;
  /** Earliest kickoff among submitted legs — acca locks when this match starts. */
  firstKickoff?: Date | null;
  legsPerMember?: number;
}) {
  const counts = new Map<string, number>();
  for (const leg of legs) {
    counts.set(leg.user.id, (counts.get(leg.user.id) ?? 0) + 1);
  }
  const pending = members.filter(
    (m) => (counts.get(m.id) ?? 0) < legsPerMember
  );
  const pendingSlots = pending.reduce(
    (sum, m) => sum + (legsPerMember - (counts.get(m.id) ?? 0)),
    0
  );

  let banner = "";
  if (status === "open") {
    if (pending.length === 0) {
      banner = "Everyone has submitted. Finishing lock…";
    } else if (firstKickoff) {
      banner = `Waiting on ${pendingSlots} leg${pendingSlots === 1 ? "" : "s"}. Acca locks at first kickoff.`;
    } else {
      banner = `Waiting on ${pendingSlots} leg${pendingSlots === 1 ? "" : "s"}${
        legsPerMember > 1 ? ` (${legsPerMember} each)` : ""
      }`;
    }
  } else if (status === "locked") {
    banner = "Acca locked. Place your bet at the bookmaker.";
  } else if (status === "settled") {
    banner = "Round settled";
  }

  return (
    <div className="space-y-3">
      {banner && (
        <div className="rounded-lg border border-accent/30 bg-accent-muted/40 px-4 py-3 text-sm text-accent">
          <p>{banner}</p>
          {status === "open" && firstKickoff && pending.length > 0 ? (
            <p className="mt-1 text-xs text-accent/80">
              Locks {formatKickoff(firstKickoff.toISOString())}. Members who
              haven&apos;t finished their picks will miss this acca.
            </p>
          ) : null}
        </div>
      )}
      <ul className="space-y-2">
        {members.map((member) => {
          const count = counts.get(member.id) ?? 0;
          const complete = count >= legsPerMember;
          return (
            <li
              key={member.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm"
            >
              <span>
                {member.name}
                {member.role === "owner" && (
                  <span className="ml-2 text-xs text-muted">owner</span>
                )}
              </span>
              <span
                className={`flex items-center gap-1 ${complete ? "text-accent" : "text-muted"}`}
              >
                {complete && <CheckIcon />}
                {legsPerMember === 1
                  ? complete
                    ? "Submitted"
                    : "Pending"
                  : `${count}/${legsPerMember}`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
