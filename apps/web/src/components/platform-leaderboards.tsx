import { formatLegPoints } from "@the-syndicate/shared";
import type { PlatformLeaderboards } from "@/lib/admin/compute-platform-leaderboards";

function LeaderboardTable({
  title,
  description,
  headers,
  rows,
}: {
  title: string;
  description: string;
  headers: string[];
  rows: React.ReactNode[];
}) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-sm text-muted">No data yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                {headers.map((h) => (
                  <th key={h} className="px-5 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function PlatformLeaderboards({ data }: { data: PlatformLeaderboards }) {
  return (
    <div className="space-y-8">
      <p className="rounded-xl border border-border bg-card/50 px-4 py-3 text-sm text-muted">
        Rankings use <strong className="text-foreground">unit-stake points</strong>. Users can
        convert points to profit on performance pages by entering their bet stake (points ×
        stake).
      </p>

      <div className="grid gap-8 lg:grid-cols-2">
        <LeaderboardTable
          title="Syndicate leaderboard"
          description="Ranked by combined member points in each group."
          headers={["#", "Syndicate", "Owner", "Members", "Points", "Record"]}
          rows={data.syndicates.map((row) => (
            <tr key={row.groupId} className="border-b border-border/60 last:border-0">
              <td className="px-5 py-3 text-muted">#{row.rank}</td>
              <td className="px-5 py-3 font-medium">{row.name}</td>
              <td className="px-5 py-3 text-muted">{row.ownerName}</td>
              <td className="px-5 py-3 text-muted">{row.memberCount}</td>
              <td className="px-5 py-3 font-semibold text-accent tabular-nums">
                {formatLegPoints(row.totalPoints)} pts
              </td>
              <td className="px-5 py-3 text-muted tabular-nums">
                {row.legsWon}W / {row.legsLost}L
              </td>
            </tr>
          ))}
        />

        <LeaderboardTable
          title="Player leaderboard"
          description="Ranked by total points across all syndicates."
          headers={["#", "Player", "Groups", "Points", "Record"]}
          rows={data.players.map((row) => (
            <tr key={row.userId} className="border-b border-border/60 last:border-0">
              <td className="px-5 py-3 text-muted">#{row.rank}</td>
              <td className="px-5 py-3 font-medium">{row.name}</td>
              <td className="px-5 py-3 text-muted">{row.groupCount}</td>
              <td className="px-5 py-3 font-semibold text-accent tabular-nums">
                {formatLegPoints(row.totalPoints)} pts
              </td>
              <td className="px-5 py-3 text-muted tabular-nums">
                {row.legsWon}W / {row.legsLost}L
              </td>
            </tr>
          ))}
        />
      </div>
    </div>
  );
}
