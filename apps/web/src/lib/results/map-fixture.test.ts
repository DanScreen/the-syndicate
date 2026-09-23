import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapFixture, type MappingCandidate } from "./map-fixture";
import {
  buildAliasLookup,
  canonicalTeamName,
  teamsEquivalent,
  teamsSimilar,
} from "./team-names";

const kickoff = new Date("2026-10-10T18:45:00.000Z");

function candidate(id: string, home: string, away: string, offsetMin = 0): MappingCandidate {
  return { id, home, away, kickoff: new Date(kickoff.getTime() + offsetMin * 60_000) };
}

describe("team names", () => {
  it("canonicalises accents, club tokens and ampersands", () => {
    assert.equal(canonicalTeamName("Türkiye"), "turkiye");
    assert.equal(canonicalTeamName("AFC Bournemouth"), "bournemouth");
    assert.equal(canonicalTeamName("Brighton & Hove Albion"), "brightonhovealbion");
    assert.equal(canonicalTeamName("Bosnia & Herzegovina"), "bosniaherzegovina");
  });

  it("treats static aliases as equivalent", () => {
    assert.equal(teamsEquivalent("Turkey", "Türkiye"), true);
    assert.equal(teamsEquivalent("Republic of Ireland", "Ireland"), true);
    assert.equal(teamsEquivalent("Wolverhampton Wanderers", "Wolves"), true);
  });

  it("does not treat Ireland and Northern Ireland as the same team", () => {
    assert.equal(teamsEquivalent("Ireland", "Northern Ireland"), false);
  });

  it("uses learned aliases in both directions", () => {
    const learned = buildAliasLookup([{ alias: "spartak", canonical: "spartakmoscow" }]);
    assert.equal(teamsEquivalent("Spartak Moscow", "Spartak", learned), true);
    assert.equal(teamsEquivalent("Spartak", "Spartak Moscow", learned), true);
  });

  it("allows containment only for the looser tier and ignores short names", () => {
    assert.equal(teamsSimilar("Brighton", "Brighton and Hove Albion"), true);
    assert.equal(teamsSimilar("AC", "AC Milan"), false);
  });
});

describe("mapFixture", () => {
  const target = { kickoff, homeNames: ["Turkey"], awayNames: ["Wales"] };

  it("maps an exact fixture through a static alias", () => {
    const r = mapFixture(target, [candidate("1", "Türkiye", "Wales"), candidate("2", "Spain", "Italy")]);
    assert.equal(r.kind, "mapped");
    assert.equal(r.kind === "mapped" && r.candidate.id, "1");
    assert.equal(r.kind === "mapped" && r.reversed, false);
  });

  it("detects a provider listing the fixture reversed", () => {
    const r = mapFixture(target, [candidate("1", "Wales", "Turkey")]);
    assert.equal(r.kind === "mapped" && r.reversed, true);
  });

  it("ignores fixtures outside the kickoff window", () => {
    const r = mapFixture(target, [candidate("1", "Turkey", "Wales", 24 * 60)]);
    assert.equal(r.kind, "none");
  });

  it("learns the other side when only one team matches in position", () => {
    const r = mapFixture(
      { kickoff, homeNames: ["Kosovo"], awayNames: ["Cyprus"] },
      [candidate("9", "Kosova", "Cyprus"), candidate("8", "Spain", "Italy")]
    );
    assert.equal(r.kind, "mapped");
    assert.deepEqual(r.kind === "mapped" && r.learned, { alias: "kosova", canonical: "kosovo" });
  });

  it("refuses to guess when two fixtures qualify", () => {
    const r = mapFixture(
      { kickoff, homeNames: ["Kosovo"], awayNames: ["Cyprus"] },
      [candidate("9", "Kosova", "Cyprus"), candidate("7", "Kosovo", "Andorra", 30)]
    );
    assert.equal(r.kind, "ambiguous");
  });

  it("maps via containment when exactly one fixture is similar on both sides", () => {
    const r = mapFixture(
      { kickoff, homeNames: ["Brighton"], awayNames: ["Man City"] },
      [candidate("3", "Brighton and Hove Albion", "Manchester City")]
    );
    assert.equal(r.kind === "mapped" && r.candidate.id, "3");
  });

  it("uses every spelling we hold (Match name + leg names)", () => {
    const r = mapFixture(
      { kickoff, homeNames: ["Czech Rep.", "Czechia"], awayNames: ["Albania"] },
      [candidate("5", "Czech Republic", "Albania")]
    );
    assert.equal(r.kind === "mapped" && r.candidate.id, "5");
  });
});
