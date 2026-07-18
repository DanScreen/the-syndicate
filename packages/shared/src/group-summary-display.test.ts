import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GroupSummaryActiveBet } from "./api-types";
import {
  activeBetProgressLabel,
  activeBetStatusLabel,
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
