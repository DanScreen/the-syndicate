import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GroupSummaryActiveBet } from "./api-types";
import {
  activeBetProgressLabel,
  activeBetStatusLabel,
  yourLegStatusMessage,
  formatLegPick,
} from "./group-summary-display";

function bet(
  overrides: Partial<GroupSummaryActiveBet> = {}
): GroupSummaryActiveBet {
  return {
    id: "round-1",
    betNumber: 1,
    status: "open",
    combinedOdds: null,
    legsPerMember: 2,
    unlimitedLegs: false,
    submittedLegCount: 3,
    requiredLegCount: 6,
    yourLegCount: 1,
    resolvedLegCount: 0,
    firstKickoff: null,
    ...overrides,
  };
}

describe("active bet group-card labels", () => {
  it("prioritises an incomplete personal quota", () => {
    assert.equal(activeBetStatusLabel(bet()), "Open");
    assert.equal(activeBetProgressLabel(bet()), "Your pick needed");
  });

  it("shows overall pick progress once this member is complete", () => {
    assert.equal(
      activeBetProgressLabel(bet({ yourLegCount: 2 })),
      "3/6 picks"
    );
  });

  it("distinguishes locked bets from those already in play", () => {
    const locked = bet({
      status: "locked",
      submittedLegCount: 6,
      firstKickoff: "2026-07-19T12:00:00.000Z",
    });
    assert.equal(
      activeBetStatusLabel(locked, Date.parse("2026-07-18T12:00:00.000Z")),
      "Locked"
    );
    assert.equal(
      activeBetStatusLabel(locked, Date.parse("2026-07-20T12:00:00.000Z")),
      "In play"
    );
    assert.equal(activeBetProgressLabel(locked), "6 legs");
  });
});

describe("solo acca group-card labels", () => {
  const solo = (overrides: Partial<GroupSummaryActiveBet> = {}) =>
    bet({ unlimitedLegs: true, legsPerMember: 1, ...overrides });

  it("invites a first leg rather than demanding a quota", () => {
    assert.equal(
      activeBetProgressLabel(
        solo({ submittedLegCount: 0, yourLegCount: 0, requiredLegCount: 0 })
      ),
      "Ready for your first leg"
    );
  });

  it("counts legs built so far instead of picks owed", () => {
    assert.equal(
      activeBetProgressLabel(
        solo({ submittedLegCount: 1, yourLegCount: 1, requiredLegCount: 1 })
      ),
      "1 leg — lock when ready"
    );
    assert.equal(
      activeBetProgressLabel(
        solo({ submittedLegCount: 4, yourLegCount: 4, requiredLegCount: 4 })
      ),
      "4 legs — lock when ready"
    );
  });

  it("invites rather than warns when nobody has picked yet", () => {
    assert.equal(
      yourLegStatusMessage("open", null, {
        yourLegCount: 0,
        legsPerMember: 1,
        roundLegCount: 0,
      }),
      "No picks yet. Get the first leg in."
    );
    assert.equal(
      yourLegStatusMessage("open", null, {
        yourLegCount: 0,
        legsPerMember: 3,
        roundLegCount: 0,
      }),
      "No picks yet. Get the first leg in."
    );
    assert.equal(
      yourLegStatusMessage("open", null, {
        yourLegCount: 0,
        legsPerMember: 1,
        roundLegCount: 2,
      }),
      "Waiting for your pick — group can't lock until you submit"
    );
  });

  it("never tells a solo player someone is waiting on them", () => {
    assert.equal(
      yourLegStatusMessage("open", null, {
        yourLegCount: 0,
        legsPerMember: 1,
        unlimitedLegs: true,
      }),
      "Add your first leg to start this acca"
    );
    assert.equal(
      yourLegStatusMessage("open", null, {
        yourLegCount: 2,
        legsPerMember: 1,
        unlimitedLegs: true,
      }),
      ""
    );
    assert.equal(
      yourLegStatusMessage("locked", null, {
        yourLegCount: 3,
        legsPerMember: 1,
        unlimitedLegs: true,
      }),
      ""
    );
  });
});

describe("formatLegPick", () => {
  const pick = (marketLabel: string, selectionLabel: string) =>
    formatLegPick({ marketLabel, selectionLabel });

  it("reads match result picks as a team to win", () => {
    assert.equal(pick("Match Winner", "Man City"), "Man City to win");
    assert.equal(pick("Match winner", "Draw"), "Draw");
    assert.equal(pick("Match Result", "Arsenal"), "Arsenal to win");
  });

  it("names goal lines and both-teams-to-score", () => {
    assert.equal(pick("Over/Under 2.5 Goals", "Over 2.5"), "Over 2.5 goals");
    assert.equal(pick("Over/Under 1.5 Goals", "Under 1.5"), "Under 1.5 goals");
    assert.equal(pick("Both Teams to Score", "Yes"), "Both teams to score");
    assert.equal(pick("Both Teams to Score", "No"), "Both teams not to score");
  });

  it("keeps double chance and prefixes anything else with its market", () => {
    assert.equal(pick("Double Chance", "Man Utd or Draw"), "Man Utd or Draw");
    assert.equal(pick("Asian Handicap", "Mexico -0.5"), "Asian Handicap: Mexico -0.5");
    assert.equal(pick("", "Mexico"), "Mexico");
  });
});
