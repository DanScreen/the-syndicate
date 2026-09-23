"use client";

import { formatFixtureLabel, formatOdds } from "@tiki-acca/shared";
import type { ReactionEmoji, RoundMessageDto } from "@tiki-acca/shared";
import { ReactionBar } from "@/components/group/chat";
import { legOutcomeClass } from "./round-helpers";
import { legOutcomeLabel } from "@tiki-acca/shared";
import type { Leg } from "./round-helpers";

export function LegsList({
  legs,
  legLinks,
  showOpenLinks = false,
  inProgress = false,
  showLegIndex = false,
  announcementByLegId,
  onAnnouncementChanged,
  currentUserId,
  editWindowOpen = false,
  canRemove = false,
  removingLegId = null,
  onChangeLeg,
  onRemoveLeg,
}: {
  legs: Leg[];
  legLinks?: { legId: string; url: string | null }[];
  showOpenLinks?: boolean;
  /** Locked acca awaiting results — show outcomes and frozen leg odds. */
  inProgress?: boolean;
  showLegIndex?: boolean;
  announcementByLegId?: Map<string, RoundMessageDto>;
  onAnnouncementChanged?: (message: RoundMessageDto) => void;
  /** When set, the current user's own legs show Change/Remove controls inline. */
  currentUserId?: string;
  editWindowOpen?: boolean;
  /** Whether removing a leg is allowed (open rounds only). */
  canRemove?: boolean;
  removingLegId?: string | null;
  onChangeLeg?: (legId: string) => void;
  onRemoveLeg?: (leg: { id: string; selectionLabel: string }) => void;
}) {
  if (legs.length === 0) {
    return <p className="text-sm text-muted">No legs submitted yet.</p>;
  }

  const linkByLegId = new Map(
    (legLinks ?? []).filter((l) => l.url).map((l) => [l.legId, l.url!])
  );

  async function react(messageId: string, emoji: ReactionEmoji) {
    const res = await fetch(`/api/messages/${messageId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    if (!res.ok) return;
    const json = (await res.json()) as { message: RoundMessageDto };
    onAnnouncementChanged?.(json.message);
  }

  return (
    <ul className="space-y-2">
      {legs.map((leg) => {
        const openUrl = showOpenLinks ? linkByLegId.get(leg.id) : undefined;
        const isOwnLeg = currentUserId != null && leg.user.id === currentUserId;
        const canEditLeg = isOwnLeg && editWindowOpen;
        const showOutcome = inProgress || leg.outcome !== "pending";
        const nameLabel =
          showLegIndex && leg.legIndex != null
            ? `${leg.user.name} · leg ${leg.legIndex}`
            : leg.user.name;

        return (
          <li
            key={leg.id}
            className={`rounded-lg border px-4 py-3 text-sm ${
              inProgress && leg.outcome !== "pending"
                ? legOutcomeClass(leg.outcome)
                : "border-border bg-card"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{nameLabel}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    {showOutcome && (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                          inProgress ? legOutcomeClass(leg.outcome) : "border-border text-muted"
                        }`}
                      >
                        {legOutcomeLabel(leg.outcome)}
                      </span>
                    )}
                    <span className="text-accent">{formatOdds(leg.odds)}</span>
                  </div>
                </div>
                <p className="text-muted">
                  {formatFixtureLabel(leg)} · {leg.marketLabel}:{" "}
                  {leg.selectionLabel}
                </p>
                <p className="text-xs text-muted">
                  {leg.competition}
                  {inProgress && (
                    <span> · Locked at {leg.bookmakerName}</span>
                  )}
                </p>
                {announcementByLegId?.get(leg.id) ? (
                  <ReactionBar
                    message={announcementByLegId.get(leg.id)!}
                    onReact={react}
                  />
                ) : null}
              </div>
              {(openUrl || canEditLeg) && (
                <div className="flex shrink-0 items-center gap-2">
                  {openUrl && (
                    <a
                      href={openUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded border border-accent/50 px-2 py-1 text-xs font-medium text-accent hover:bg-accent-muted/30"
                    >
                      Open
                    </a>
                  )}
                  {canEditLeg && onChangeLeg && (
                    <button
                      type="button"
                      onClick={() => onChangeLeg(leg.id)}
                      className="rounded border border-accent px-2 py-1 text-xs font-medium text-accent hover:bg-accent-muted/30"
                    >
                      Change
                    </button>
                  )}
                  {canEditLeg && canRemove && onRemoveLeg && (
                    <button
                      type="button"
                      disabled={removingLegId === leg.id}
                      onClick={() =>
                        onRemoveLeg({ id: leg.id, selectionLabel: leg.selectionLabel })
                      }
                      className="rounded border border-danger/60 px-2 py-1 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
                    >
                      {removingLegId === leg.id ? "Removing…" : "Remove"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
