import {
  canonicalTeamName,
  teamsEquivalent,
  teamsSimilar,
  type AliasLookup,
} from "@/lib/results/team-names";

/** Kickoff tolerance when mapping one provider's fixture onto a Match (spec §3.2). */
export const MAPPING_KICKOFF_WINDOW_MS = 3 * 60 * 60 * 1000;

export type MappingTarget = {
  kickoff: Date;
  /** Every spelling we hold for the home side (Match row, linked legs). */
  homeNames: string[];
  awayNames: string[];
};

export type MappingCandidate = {
  id: string;
  kickoff: Date;
  home: string;
  away: string;
};

export type LearnedAlias = { alias: string; canonical: string };

export type MappingResult =
  | {
      kind: "mapped";
      candidate: MappingCandidate;
      /** Provider lists the fixture with home/away swapped. */
      reversed: boolean;
      /** Alias to record when the match was made on one side only. */
      learned?: LearnedAlias;
    }
  | { kind: "ambiguous"; candidateIds: string[] }
  | { kind: "none" };

type SideTest = (ours: string, theirs: string) => boolean;

function sideMatches(names: string[], theirs: string, test: SideTest): boolean {
  return names.some((name) => test(name, theirs));
}

function orientation(
  target: MappingTarget,
  candidate: MappingCandidate,
  test: SideTest
): "direct" | "reversed" | null {
  if (
    sideMatches(target.homeNames, candidate.home, test) &&
    sideMatches(target.awayNames, candidate.away, test)
  ) {
    return "direct";
  }
  if (
    sideMatches(target.homeNames, candidate.away, test) &&
    sideMatches(target.awayNames, candidate.home, test)
  ) {
    return "reversed";
  }
  return null;
}

/**
 * Map one of our matches onto a provider fixture: same competition (caller
 * filters), kickoff within ±3h, then by tier — exact/alias names on both
 * sides, then containment on both sides, then one side exact with the other
 * side learned as an alias. Each tier must yield exactly one fixture; more
 * than one is ambiguous and nothing is mapped.
 */
export function mapFixture(
  target: MappingTarget,
  candidates: MappingCandidate[],
  learned: AliasLookup = new Map(),
  windowMs = MAPPING_KICKOFF_WINDOW_MS
): MappingResult {
  const inWindow = candidates.filter(
    (c) => Math.abs(c.kickoff.getTime() - target.kickoff.getTime()) <= windowMs
  );
  if (inWindow.length === 0) return { kind: "none" };

  const exact: SideTest = (a, b) => teamsEquivalent(a, b, learned);
  const similar: SideTest = (a, b) => teamsSimilar(a, b, learned);

  for (const test of [exact, similar]) {
    const hits = inWindow
      .map((candidate) => ({ candidate, dir: orientation(target, candidate, test) }))
      .filter((hit) => hit.dir !== null);
    if (hits.length === 1) {
      return {
        kind: "mapped",
        candidate: hits[0]!.candidate,
        reversed: hits[0]!.dir === "reversed",
      };
    }
    if (hits.length > 1) {
      return { kind: "ambiguous", candidateIds: hits.map((h) => h.candidate.id) };
    }
  }

  // One side exact, same position. Learn the other side as an alias.
  const oneSided = inWindow.flatMap((candidate) => {
    const homeHit = sideMatches(target.homeNames, candidate.home, exact);
    const awayHit = sideMatches(target.awayNames, candidate.away, exact);
    if (homeHit === awayHit) return [];
    const ours = homeHit ? target.awayNames[0] : target.homeNames[0];
    const theirs = homeHit ? candidate.away : candidate.home;
    if (!ours) return [];
    return [{ candidate, learned: { ours, theirs } }];
  });
  if (oneSided.length === 1) {
    const hit = oneSided[0]!;
    return {
      kind: "mapped",
      candidate: hit.candidate,
      reversed: false,
      learned: {
        alias: canonicalTeamName(hit.learned.theirs),
        canonical: canonicalTeamName(hit.learned.ours),
      },
    };
  }
  if (oneSided.length > 1) {
    return { kind: "ambiguous", candidateIds: oneSided.map((h) => h.candidate.id) };
  }

  return { kind: "none" };
}
