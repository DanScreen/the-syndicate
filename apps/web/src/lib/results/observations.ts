import {
  resolveMatchConsensus,
  statsFingerprint,
  type ObservationInput,
  type ObservedStats,
  type ResultsProvider,
} from "@/lib/results/consensus";
import {
  isTerminalMatchStatus,
  matchScoreChanged,
} from "@/lib/results/result-confirmation";
import { prisma } from "@tiki-acca/database";
import { Prisma, type MatchObservation } from "@prisma/client";
import { RESULT_CONFIRMATION_MS } from "@tiki-acca/shared";

/** A provider's reading of a fixture, already in its own home/away orientation. */
export type ProviderReading = Omit<ObservationInput, "provider" | "observedAt">;

/** Swap a reading into the Match's orientation when the provider lists it reversed. */
export function orientReading(reading: ProviderReading, reversed: boolean): ProviderReading {
  if (!reversed) return reading;
  const swap = (s: { home: number; away: number } | null | undefined) =>
    s ? { home: s.away, away: s.home } : s;
  return {
    status: reading.status,
    homeGoals90: reading.awayGoals90,
    awayGoals90: reading.homeGoals90,
    homeGoalsEnd: reading.awayGoalsEnd,
    awayGoalsEnd: reading.homeGoalsEnd,
    homeGoalsHt: reading.awayGoalsHt,
    awayGoalsHt: reading.homeGoalsHt,
    extraTime: reading.extraTime,
    stats: reading.stats
      ? {
          corners: swap(reading.stats.corners),
          yellowCards: swap(reading.stats.yellowCards),
          redCards: swap(reading.stats.redCards),
        }
      : null,
  };
}

function readingFingerprint(r: ProviderReading): string {
  return [
    r.status,
    r.homeGoals90,
    r.awayGoals90,
    r.homeGoalsEnd,
    r.awayGoalsEnd,
    r.homeGoalsHt,
    r.awayGoalsHt,
    r.extraTime,
    statsFingerprint(r.stats),
  ].join("|");
}

export function observationToInput(row: MatchObservation): ObservationInput {
  return {
    provider: row.provider,
    status: row.status,
    homeGoals90: row.homeGoals90,
    awayGoals90: row.awayGoals90,
    homeGoalsEnd: row.homeGoalsEnd,
    awayGoalsEnd: row.awayGoalsEnd,
    homeGoalsHt: row.homeGoalsHt,
    awayGoalsHt: row.awayGoalsHt,
    extraTime: row.extraTime,
    stats: (row.stats as ObservedStats | null) ?? null,
    observedAt: row.observedAt,
  };
}

/**
 * Upsert one provider's observation (Match orientation). Returns whether any
 * settled field changed, so callers only recompute consensus when needed.
 */
export async function recordObservation(input: {
  matchId: string;
  provider: ResultsProvider;
  externalId: string;
  reversed: boolean;
  reading: ProviderReading;
  now?: Date;
  /** Preloaded row (null = known absent); omitted → looked up. */
  existing?: MatchObservation | null;
}): Promise<{ changed: boolean }> {
  const now = input.now ?? new Date();
  const reading = orientReading(input.reading, input.reversed);
  const existing =
    input.existing !== undefined
      ? input.existing
      : await prisma.matchObservation.findUnique({
          where: { matchId_provider: { matchId: input.matchId, provider: input.provider } },
        });

  const fields = {
    externalId: input.externalId,
    reversed: input.reversed,
    status: reading.status,
    homeGoals90: reading.homeGoals90,
    awayGoals90: reading.awayGoals90,
    homeGoalsEnd: reading.homeGoalsEnd,
    awayGoalsEnd: reading.awayGoalsEnd,
    homeGoalsHt: reading.homeGoalsHt,
    awayGoalsHt: reading.awayGoalsHt,
    extraTime: reading.extraTime,
    stats: reading.stats ? (reading.stats as Prisma.InputJsonValue) : Prisma.DbNull,
    observedAt: now,
  };

  if (!existing) {
    await prisma.matchObservation.create({
      data: { ...fields, matchId: input.matchId, provider: input.provider, changedAt: now },
    });
    return { changed: true };
  }

  const changed =
    readingFingerprint(observationToInput(existing)) !== readingFingerprint(reading) ||
    existing.externalId !== input.externalId ||
    existing.reversed !== input.reversed;

  await prisma.matchObservation.update({
    where: { id: existing.id },
    data: {
      ...fields,
      ...(changed ? { changedAt: now } : {}),
    },
  });
  return { changed };
}

export type ApplyConsensusResult = {
  matchId: string;
  /** Terminal 90' score changed, or the match newly became terminal. */
  scoreChanged: boolean;
  kind: string | null;
};

/**
 * Recompute the canonical Match from its observations. Keeps today's rules:
 * admin lock wins; a changed FT score restarts the stability clock;
 * `finishedAt` marks the first terminal observation. Conflicts keep the last
 * canonical score and hold auto-settle via `resultSource`.
 */
export async function applyMatchConsensus(
  matchId: string,
  now: Date = new Date()
): Promise<ApplyConsensusResult> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { observations: true },
  });
  if (!match) return { matchId, scoreChanged: false, kind: null };

  if (match.scoreLocked) {
    await prisma.match.update({ where: { id: match.id }, data: { lastSyncedAt: now } });
    return { matchId, scoreChanged: false, kind: "locked" };
  }

  const canonical = resolveMatchConsensus(match.observations.map(observationToInput));

  const statsChanged =
    statsFingerprint(canonical.stats) !==
    statsFingerprint(match.stats as ObservedStats | null);
  const statsFields = {
    stats: canonical.stats
      ? (canonical.stats as Prisma.InputJsonValue)
      : Prisma.DbNull,
    statsStableSince: statsChanged
      ? canonical.stats
        ? now
        : null
      : match.statsStableSince,
    homeGoalsHt: canonical.homeGoalsHt,
    awayGoalsHt: canonical.awayGoalsHt,
    wentToExtraTime: canonical.wentToExtraTime,
  };

  if (canonical.kind === "conflict" || canonical.kind === "abstain") {
    await prisma.match.update({
      where: { id: match.id },
      data: { ...statsFields, resultSource: canonical.kind, lastSyncedAt: now },
    });
    return { matchId, scoreChanged: false, kind: canonical.kind };
  }

  const isTerminal = isTerminalMatchStatus(canonical.status);
  const becomingTerminal = isTerminal && !isTerminalMatchStatus(match.status);
  const scoreChanged =
    becomingTerminal ||
    (isTerminal &&
      matchScoreChanged(
        { homeGoals: match.homeGoals, awayGoals: match.awayGoals },
        { homeGoals: canonical.homeGoals, awayGoals: canonical.awayGoals }
      ));

  const finishedAt =
    match.finishedAt ??
    (isTerminal
      ? // Already terminal before finishedAt existed → treat as confirmed.
        isTerminalMatchStatus(match.status)
        ? new Date(now.getTime() - RESULT_CONFIRMATION_MS)
        : now
      : null);

  let scoreStableSince = match.scoreStableSince;
  if (!isTerminal) {
    scoreStableSince = null;
  } else if (scoreChanged) {
    scoreStableSince = now;
  } else if (!scoreStableSince) {
    scoreStableSince = finishedAt;
  }

  await prisma.match.update({
    where: { id: match.id },
    data: {
      status: canonical.status,
      homeGoals: canonical.homeGoals,
      awayGoals: canonical.awayGoals,
      finishedAt,
      scoreStableSince,
      resultSource: isTerminal ? canonical.kind : null,
      lastSyncedAt: now,
      ...statsFields,
    },
  });

  return { matchId, scoreChanged: isTerminal && scoreChanged, kind: canonical.kind };
}
