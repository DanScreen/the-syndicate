import type { LearnedAlias } from "@/lib/results/map-fixture";
import { buildAliasLookup, type AliasLookup } from "@/lib/results/team-names";
import { prisma } from "@tiki-acca/database";

/** Learned team aliases (both directions), for fixture mapping. */
export async function loadAliasLookup(): Promise<AliasLookup> {
  const rows = await prisma.teamAlias.findMany({ select: { alias: true, canonical: true } });
  return buildAliasLookup(rows);
}

/** Persist an alias learned from a one-sided mapping and add it to the live lookup. */
export async function recordLearnedAlias(
  learned: LearnedAlias,
  competitionId: string,
  lookup: AliasLookup
): Promise<void> {
  if (!learned.alias || !learned.canonical || learned.alias === learned.canonical) return;
  await prisma.teamAlias.upsert({
    where: { alias_canonical: { alias: learned.alias, canonical: learned.canonical } },
    create: { ...learned, competitionId, source: "auto" },
    update: {},
  });
  for (const [a, b] of [
    [learned.alias, learned.canonical],
    [learned.canonical, learned.alias],
  ] as const) {
    const set = lookup.get(a) ?? new Set<string>();
    set.add(b);
    lookup.set(a, set);
  }
}
