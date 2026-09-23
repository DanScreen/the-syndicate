function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  );
}

export type AdminStatsData = {
  users: number;
  groups: number;
  picks: number;
  accas: number;
  accasLocked: number;
  accasSettled: number;
  accasSuccessful: number;
  accasFailed: number;
  signUpsLast7Days: number;
  signUpsLast30Days: number;
  loginsLast7Days: number;
  loginsLast30Days: number;
  pageViewsLast7Days: number;
  pageViewsLast30Days: number;
};

export function AdminStats({ stats }: { stats: AdminStatsData }) {
  return (
    <div className="space-y-10">
      <Section title="Platform totals">
        <StatCard label="Players" value={stats.users} />
        <StatCard label="Groups" value={stats.groups} />
        <StatCard label="Picks (legs)" value={stats.picks} />
        <StatCard label="Accas formed" value={stats.accas} hint="Locked or settled rounds" />
      </Section>

      <Section title="Acca outcomes">
        <StatCard label="In progress" value={stats.accasLocked} hint="Locked, awaiting results" />
        <StatCard label="Settled" value={stats.accasSettled} />
        <StatCard label="Successful" value={stats.accasSuccessful} hint="All legs won — profit > £0" />
        <StatCard label="Unsuccessful" value={stats.accasFailed} hint="At least one leg lost" />
      </Section>

      <Section title="Activity (last 7 / 30 days)">
        <StatCard
          label="Sign-ups"
          value={`${stats.signUpsLast7Days} / ${stats.signUpsLast30Days}`}
          hint="7d / 30d"
        />
        <StatCard
          label="Logins"
          value={`${stats.loginsLast7Days} / ${stats.loginsLast30Days}`}
          hint="7d / 30d"
        />
        <StatCard
          label="Page views"
          value={`${stats.pageViewsLast7Days} / ${stats.pageViewsLast30Days}`}
          hint="7d / 30d"
        />
      </Section>
    </div>
  );
}
