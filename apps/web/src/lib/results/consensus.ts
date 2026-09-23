/**
 * Canonical result from per-provider observations
 * (docs/specs/odds-and-results-sourcing.md §3.1). Pure — the caller writes
 * the Match row and keeps the existing stability clock, admin lock and
 * reconcile behaviour.
 */

export type ResultsProvider = "api_football" | "football_data";

/** Provider order for picking live state, half-time and stats. */
const PROVIDER_PRIORITY: ResultsProvider[] = ["api_football", "football_data"];

export type ScorePair = { home: number; away: number };

export type ObservedStats = {
  corners?: ScorePair | null;
  yellowCards?: ScorePair | null;
  redCards?: ScorePair | null;
};

export type ObservationInput = {
  provider: string;
  status: string;
  homeGoals90: number | null;
  awayGoals90: number | null;
  homeGoalsEnd: number | null;
  awayGoalsEnd: number | null;
  homeGoalsHt: number | null;
  awayGoalsHt: number | null;
  extraTime: boolean;
  stats: ObservedStats | null;
  observedAt: Date;
};

export type ConsensusKind =
  /** No provider reports a terminal status yet. */
  | "pending"
  /** ≥2 providers agree on status and 90' score. */
  | "agreed"
  /** Exactly one provider has a terminal opinion. */
  | "single"
  /** Terminal providers disagree — hold for sources to converge or an admin. */
  | "conflict"
  /** Terminal, but no provider can give the 90' score (extra time without a regulation split). */
  | "abstain";

export type CanonicalResult = {
  kind: ConsensusKind;
  status: string;
  homeGoals: number | null;
  awayGoals: number | null;
  homeGoalsHt: number | null;
  awayGoalsHt: number | null;
  wentToExtraTime: boolean;
  stats: ObservedStats | null;
  /** Providers whose opinion produced the result. */
  providers: string[];
};

export const VOID_MATCH_STATUSES = new Set([
  "POSTPONED",
  "CANCELLED",
  "SUSPENDED",
  "AWARDED",
]);

function isTerminal(status: string): boolean {
  return status === "FINISHED" || VOID_MATCH_STATUSES.has(status);
}

function byPriority(a: ObservationInput, b: ObservationInput): number {
  const pa = PROVIDER_PRIORITY.indexOf(a.provider as ResultsProvider);
  const pb = PROVIDER_PRIORITY.indexOf(b.provider as ResultsProvider);
  return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
}

/** A terminal observation's vote, or null when it must abstain. */
function opinionKey(obs: ObservationInput): string | null {
  if (VOID_MATCH_STATUSES.has(obs.status)) return "void";
  if (obs.homeGoals90 === null || obs.awayGoals90 === null) return null;
  return `FT:${obs.homeGoals90}-${obs.awayGoals90}`;
}

function halfTimeFrom(sorted: ObservationInput[]): ScorePair | null {
  const withHt = sorted.find((o) => o.homeGoalsHt !== null && o.awayGoalsHt !== null);
  return withHt ? { home: withHt.homeGoalsHt!, away: withHt.awayGoalsHt! } : null;
}

export function resolveMatchConsensus(observations: ObservationInput[]): CanonicalResult {
  const sorted = [...observations].sort(byPriority);
  const statsSource = sorted.find((o) => o.stats);
  const halfTime = halfTimeFrom(sorted);
  const base = {
    homeGoalsHt: halfTime?.home ?? null,
    awayGoalsHt: halfTime?.away ?? null,
    stats: statsSource?.stats ?? null,
  };

  const terminal = sorted.filter((o) => isTerminal(o.status));
  if (terminal.length === 0) {
    // Live / scheduled: show the most useful live state (API-Football first).
    const live = sorted[0];
    return {
      kind: "pending",
      status: live?.status ?? "SCHEDULED",
      homeGoals: live?.homeGoalsEnd ?? live?.homeGoals90 ?? null,
      awayGoals: live?.awayGoalsEnd ?? live?.awayGoals90 ?? null,
      wentToExtraTime: false,
      ...base,
      providers: live ? [live.provider] : [],
    };
  }

  const wentToExtraTime = terminal.some((o) => o.extraTime);
  const votes = new Map<string, ObservationInput[]>();
  for (const obs of terminal) {
    const key = opinionKey(obs);
    if (key === null) continue;
    const list = votes.get(key) ?? [];
    list.push(obs);
    votes.set(key, list);
  }

  const lead = terminal[0]!;
  if (votes.size === 0) {
    return {
      kind: "abstain",
      status: lead.status,
      homeGoals: null,
      awayGoals: null,
      wentToExtraTime,
      ...base,
      providers: terminal.map((o) => o.provider),
    };
  }

  if (votes.size > 1) {
    return {
      kind: "conflict",
      status: lead.status,
      homeGoals: null,
      awayGoals: null,
      wentToExtraTime,
      ...base,
      providers: terminal.map((o) => o.provider),
    };
  }

  const [key, voters] = [...votes.entries()][0]!;
  const winner = voters[0]!;
  return {
    kind: voters.length >= 2 ? "agreed" : "single",
    status: winner.status,
    homeGoals: key === "void" ? null : winner.homeGoals90,
    awayGoals: key === "void" ? null : winner.awayGoals90,
    wentToExtraTime,
    ...base,
    providers: voters.map((o) => o.provider),
  };
}

/** Stable JSON for change detection on stats blobs. */
export function statsFingerprint(stats: ObservedStats | null | undefined): string {
  if (!stats) return "";
  const pair = (p: ScorePair | null | undefined) => (p ? `${p.home}-${p.away}` : "_");
  return `c${pair(stats.corners)}|y${pair(stats.yellowCards)}|r${pair(stats.redCards)}`;
}
