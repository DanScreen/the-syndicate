"use client";

import { PointsText } from "@/components/points-text";

export function Leaderboard({
  entries,
}: {
  entries: {
    userId: string;
    name: string;
    points: number;
    legsWon: number;
    legsLost: number;
    role?: string;
  }[];
}) {
  return (
    <ol className="space-y-2">
      {entries.map((entry, i) => (
        <li
          key={entry.userId}
          className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm"
        >
          <div className="flex items-center gap-3">
            <span className="w-6 text-muted">#{i + 1}</span>
            <div>
              <p className="font-medium">
                {entry.name}
                {entry.role === "owner" && (
                  <span className="ml-2 text-xs text-accent">owner</span>
                )}
              </p>
              <p className="text-xs text-muted">
                {entry.legsWon}W / {entry.legsLost}L
              </p>
            </div>
          </div>
          <PointsText points={entry.points} className="font-semibold" />
        </li>
      ))}
    </ol>
  );
}
