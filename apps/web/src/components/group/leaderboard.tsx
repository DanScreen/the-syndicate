"use client";

import { Avatar } from "@/components/avatar";
import { PointsText } from "@/components/points-text";
import {
  computeCompetitionRanks,
  formatWinRate,
  getLeaderboardTags,
} from "@tiki-acca/shared";

export function Leaderboard({
  entries,
  currentUserId,
}: {
  entries: {
    userId: string;
    name: string;
    points: number;
    legsWon: number;
    legsLost: number;
    role?: string;
    avatarUrl?: string | null;
  }[];
  /** Highlights the signed-in member's row. */
  currentUserId?: string;
}) {
  const ranks = computeCompetitionRanks(entries.map((e) => e.points));
  const tags = getLeaderboardTags(entries);
  // Leader styling only when a single row holds first place; a tie for first gets none.
  const firstPlaceCount = ranks.filter((rank) => rank === 1).length;

  return (
    <ol className="space-y-2">
      {entries.map((entry, i) => {
        const rank = ranks[i];
        // A sole leader only, and never in a one-member (solo) group.
        const isLeader = rank === 1 && firstPlaceCount === 1 && entries.length > 1;
        const isMe = currentUserId !== undefined && entry.userId === currentUserId;
        const tag = tags[entry.userId];
        const hitRate = formatWinRate(entry.legsWon, entry.legsLost);
        const record = `${entry.legsWon}W · ${entry.legsLost}L`;

        return (
          <li
            key={entry.userId}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
              isLeader ? "border-warning" : "border-border"
            } ${isMe ? "bg-accent-muted/30" : "bg-card"}`}
          >
            <span
              className={`w-6 shrink-0 text-center font-semibold tabular-nums ${
                isLeader ? "text-warning" : "text-muted"
              }`}
            >
              {rank}
            </span>
            <Avatar
              name={entry.name}
              userId={entry.userId}
              size={isLeader ? "lg" : "md"}
              imageUrl={entry.avatarUrl ?? null}
            />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <p className="min-w-0 truncate font-medium">
                  {entry.name}
                  {entry.role === "owner" && (
                    <span className="ml-1 text-xs text-muted">(owner)</span>
                  )}
                </p>
                {tag && (
                  <span className="shrink-0 rounded-full border border-border px-2 text-xs text-muted">
                    {tag}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted">
                {[record, hitRate].filter(Boolean).join(" · ")}
              </p>
            </div>
            <PointsText points={entry.points} className="shrink-0 font-semibold" />
          </li>
        );
      })}
    </ol>
  );
}
