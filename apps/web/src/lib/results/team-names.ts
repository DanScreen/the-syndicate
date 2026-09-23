/**
 * Cross-provider team-name equivalence for mapping fixtures between The Odds
 * API, football-data.org and API-Football (docs/specs/odds-and-results-sourcing.md §3.2).
 *
 * Stricter than `teamNamesMatch()` in football-data.ts: that one allows any
 * substring (so "Ireland" ≈ "Northern Ireland"), which is fine for joining a
 * leg to a match on the same day but not for a first-time mapping.
 */

/** Club-type tokens that providers add or drop ("Arsenal FC", "AFC Bournemouth"). */
const NOISE_TOKENS = new Set(["fc", "afc", "cf", "sc", "ac", "the", "and"]);

/**
 * Names known to differ between providers. Each group is one team; entries are
 * normalised with `canonicalTeamName()`. Seeded from the 2026-09 probe (Nations
 * League) plus well-known English short names. Anything else is auto-learned
 * into `TeamAlias` when a fixture maps unambiguously on the other side.
 */
const STATIC_ALIAS_GROUPS: string[][] = [
  ["republicofireland", "repofireland", "ireland"],
  ["turkey", "turkiye"],
  ["czechrepublic", "czechia"],
  ["northmacedonia", "fyrmacedonia", "macedonia"],
  ["southkorea", "korearepublic", "korea"],
  ["usa", "unitedstates", "us"],
  ["bosniaherzegovina", "bosniaandherzegovina", "bosnia"],
  ["wolverhamptonwanderers", "wolves", "wolverhampton"],
  ["tottenhamhotspur", "tottenham", "spurs"],
  ["manchesterunited", "manutd", "manchesterutd"],
  ["manchestercity", "mancity"],
  ["nottinghamforest", "nottmforest"],
  ["brightonhovealbion", "brighton"],
  ["westhamunited", "westham"],
  ["newcastleunited", "newcastle"],
  ["sheffieldunited", "sheffieldutd"],
  ["sheffieldwednesday", "sheffieldwed"],
  ["queensparkrangers", "qpr"],
  ["miltonkeynesdons", "mkdons"],
  ["westbromwichalbion", "westbrom"],
  ["leedsunited", "leeds"],
  ["leicestercity", "leicester"],
  ["inter", "internazionale", "intermilan"],
];

const STATIC_ALIAS_INDEX = new Map<string, number>();
STATIC_ALIAS_GROUPS.forEach((group, i) => {
  for (const name of group) STATIC_ALIAS_INDEX.set(name, i);
});

/** Lowercase, strip accents, drop club-type tokens, keep [a-z0-9]. */
export function canonicalTeamName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .split(/[^a-z0-9]+/)
    .filter((token) => token && !NOISE_TOKENS.has(token))
    .join("");
}

/** Learned alias pairs (normalised), both directions. */
export type AliasLookup = Map<string, Set<string>>;

export function buildAliasLookup(
  rows: { alias: string; canonical: string }[]
): AliasLookup {
  const lookup: AliasLookup = new Map();
  const add = (a: string, b: string) => {
    const set = lookup.get(a) ?? new Set<string>();
    set.add(b);
    lookup.set(a, set);
  };
  for (const row of rows) {
    add(row.alias, row.canonical);
    add(row.canonical, row.alias);
  }
  return lookup;
}

/** Exact equivalence: same canonical name, a static alias group, or a learned alias. */
export function teamsEquivalent(
  a: string,
  b: string,
  learned: AliasLookup = new Map()
): boolean {
  const na = canonicalTeamName(a);
  const nb = canonicalTeamName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const ga = STATIC_ALIAS_INDEX.get(na);
  if (ga !== undefined && ga === STATIC_ALIAS_INDEX.get(nb)) return true;

  return learned.get(na)?.has(nb) ?? false;
}

/**
 * Looser tier used only when exactly one fixture in the window qualifies:
 * one canonical name contains the other ("brighton" ⊂ "brightonhovealbion").
 */
export function teamsSimilar(a: string, b: string, learned?: AliasLookup): boolean {
  if (teamsEquivalent(a, b, learned)) return true;
  const na = canonicalTeamName(a);
  const nb = canonicalTeamName(b);
  if (na.length < 4 || nb.length < 4) return false;
  return na.includes(nb) || nb.includes(na);
}
