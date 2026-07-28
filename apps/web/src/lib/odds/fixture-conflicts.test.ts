import assert from "node:assert/strict";
import test from "node:test";
import {
  findConflictingFixtureLeg,
  findOutrightMixConflict,
  formatFixtureConflictError,
  formatOutrightMixError,
  isFixtureTaken,
  outrightFixtureId,
} from "@tiki-acca/shared";

const existing = [
  {
    id: "leg-1",
    fixtureId: "spain-argentina",
    marketType: "over_under_25",
    homeTeam: "Spain",
    awayTeam: "Argentina",
    marketLabel: "Over/Under 2.5 Goals",
  },
];

test("blocks a different market on an occupied fixture", () => {
  const conflict = findConflictingFixtureLeg(existing, "spain-argentina");

  assert.equal(conflict?.id, "leg-1");
  assert.equal(isFixtureTaken(existing, "spain-argentina"), true);
  assert.equal(
    formatFixtureConflictError(conflict!),
    "This acca already has a pick on Spain vs Argentina. Choose a different fixture — only one leg per match is supported."
  );
});

test("allows another fixture and excludes the leg being edited", () => {
  assert.equal(isFixtureTaken(existing, "france-england"), false);
  assert.equal(isFixtureTaken(existing, "spain-argentina", "leg-1"), false);
});

const outrightLeg = {
  id: "leg-outright",
  fixtureId: outrightFixtureId("premier-league"),
  marketType: "league_winner",
  homeTeam: "Premier League",
  awayTeam: "Outright winner",
  marketLabel: "League Winner",
};

test("blocks an outright from joining a match acca", () => {
  const conflict = findOutrightMixConflict(existing, outrightFixtureId("premier-league"));

  assert.equal(conflict?.candidateIsOutright, true);
  assert.match(formatOutrightMixError(conflict!), /already has match picks/);
});

test("blocks a match pick from joining an outrights acca", () => {
  const conflict = findOutrightMixConflict([outrightLeg], "spain-argentina");

  assert.equal(conflict?.candidateIsOutright, false);
  assert.match(formatOutrightMixError(conflict!), /outrights acca/);
});

test("allows homogeneous accas and ignores the leg being edited", () => {
  assert.equal(findOutrightMixConflict(existing, "france-england"), null);
  assert.equal(
    findOutrightMixConflict([outrightLeg], outrightFixtureId("la-liga")),
    null
  );
  // Swapping the only leg from a match pick to an outright is allowed.
  assert.equal(
    findOutrightMixConflict(existing, outrightFixtureId("premier-league"), "leg-1"),
    null
  );
});
