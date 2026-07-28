import assert from "node:assert/strict";
import test from "node:test";
import {
  currentSeasonEndDate,
  formatFixtureLabel,
  isOutrightFixtureId,
  outrightFixtureId,
} from "./fixtures";

test("outright fixture ids round-trip through the prefix check", () => {
  const id = outrightFixtureId("premier-league");
  assert.equal(isOutrightFixtureId(id), true);
  assert.equal(isOutrightFixtureId("abc123"), false);
});

test("formats an outright fixture without an opponent", () => {
  const label = formatFixtureLabel({
    id: outrightFixtureId("premier-league"),
    homeTeam: "Premier League",
    awayTeam: "Outright winner",
  });
  assert.equal(label, "Premier League — Outright");
});

test("formats a normal fixture with the requested separator", () => {
  const fixture = { id: "evt-1", homeTeam: "Spain", awayTeam: "France" };
  assert.equal(formatFixtureLabel(fixture), "Spain vs France");
  assert.equal(formatFixtureLabel(fixture, "v"), "Spain v France");
});

test("prefers a leg's fixtureId over its own row id", () => {
  const leg = {
    id: "leg-1",
    fixtureId: outrightFixtureId("la-liga"),
    homeTeam: "La Liga",
    awayTeam: "Outright winner",
  };
  assert.equal(formatFixtureLabel(leg), "La Liga — Outright");
});

test("season end is always in the future, every month of the year", () => {
  for (let month = 0; month < 12; month++) {
    const now = new Date(Date.UTC(2026, month, 15, 12, 0, 0));
    const end = currentSeasonEndDate(now);
    assert.ok(
      end.getTime() > now.getTime(),
      `season end ${end.toISOString()} is not after ${now.toISOString()}`
    );
  }
});

test("season end rolls to next May once June arrives", () => {
  assert.equal(
    currentSeasonEndDate(new Date(Date.UTC(2026, 4, 1))).toISOString().slice(0, 10),
    "2026-05-31"
  );
  assert.equal(
    currentSeasonEndDate(new Date(Date.UTC(2026, 5, 1))).toISOString().slice(0, 10),
    "2027-05-31"
  );
});
