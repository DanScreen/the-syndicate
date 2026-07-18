import assert from "node:assert/strict";
import test from "node:test";
import {
  findConflictingFixtureLeg,
  formatFixtureConflictError,
  isFixtureTaken,
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
