import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GroupSummaryActiveBet } from "./api-types";
import {
  activeBetProgressLabel,
  activeBetStatusLabel,
  yourLegStatusMessage,
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
