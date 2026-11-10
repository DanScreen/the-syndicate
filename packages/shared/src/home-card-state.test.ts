import assert from "node:assert/strict";
import { test } from "node:test";
import type { GroupSummary, GroupSummaryActiveBet } from "./api-types";
import { deriveHomeCardState } from "./home-card-state";

const ROUND_ID = "round-1";

function bet(overrides: Partial<GroupSummaryActiveBet> = {}): GroupSummaryActiveBet {
  return {
    id: ROUND_ID,
    betNumber: 1,
    status: "open",
    combinedOdds: null,
    legsPerMember: 2,
    unlimitedLegs: false,
    submittedLegCount: 1,
    requiredLegCount: 2,
    yourLegCount: 0,
    resolvedLegCount: 0,
    firstKickoff: null,
    ...overrides,
  };
}

function group(overrides: Partial<GroupSummary> = {}): GroupSummary {
  return {
    id: "group-1",
    name: "The Lads",
    inviteCode: "ABC123",
    role: "member",
    memberCount: 3,
    status: "open",
    ownerName: "Tom",
    legsPerMember: 2,
    maxActiveBets: 1,
    activeBetCount: 1,
    activeBets: [bet()],
    groupPoints: 0,
    points: 0,
    activeRound: { id: ROUND_ID, betNumber: 1, status: "open", combinedOdds: null, legsPerMember: 2 },
    activeLegs: [],
    yourLeg: null,
    yourLegCount: 0,
    unreadMessageCount: 0,
    ...overrides,
  };
}

test("open round where the user still owes a leg needs a pick", () => {
  const result = deriveHomeCardState(group({ activeBets: [bet({ yourLegCount: 1 })], yourLegCount: 1 }));
  assert.equal(result.state, "needs-pick");
  assert.equal(result.bet?.id, ROUND_ID);
});

test("open round where the user has submitted their quota is waiting", () => {
  const result = deriveHomeCardState(
    group({ activeBets: [bet({ yourLegCount: 2 })], yourLegCount: 2 }),
  );
  assert.equal(result.state, "waiting");
});

test("locked round is the betslip state", () => {
  const locked = group({
    status: "locked",
    activeRound: { id: ROUND_ID, betNumber: 1, status: "locked", combinedOdds: 5, legsPerMember: 2 },
    activeBets: [bet({ status: "locked", yourLegCount: 2 })],
  });
  assert.equal(deriveHomeCardState(locked).state, "betslip");
});

test("no active round falls back", () => {
  const result = deriveHomeCardState(group({ activeRound: null, activeBets: [], activeBetCount: 0 }));
  assert.equal(result.state, "fallback");
  assert.equal(result.bet, null);
});

test("solo acca with no legs needs a pick", () => {
  const result = deriveHomeCardState(
    group({ activeBets: [bet({ unlimitedLegs: true, yourLegCount: 0 })], yourLegCount: 0 }),
  );
  assert.equal(result.state, "needs-pick");
});

test("solo acca with one leg is waiting", () => {
  const result = deriveHomeCardState(
    group({ activeBets: [bet({ unlimitedLegs: true, yourLegCount: 1, submittedLegCount: 1 })], yourLegCount: 1 }),
  );
  assert.equal(result.state, "waiting");
});

test("open round missing from activeBets uses round-level fields", () => {
  const owing = deriveHomeCardState(group({ activeBets: [], yourLegCount: 0 }));
  assert.equal(owing.state, "needs-pick");
  assert.equal(owing.bet, null);

  const done = deriveHomeCardState(group({ activeBets: [], yourLegCount: 2 }));
  assert.equal(done.state, "waiting");
  assert.equal(done.bet, null);
});
