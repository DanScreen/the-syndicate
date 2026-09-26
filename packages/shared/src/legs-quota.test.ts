import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SOLO_MAX_LEGS } from "./constants";
import { allMembersFilledQuota, effectiveLegQuota, openRoundReadyToLock } from "./legs-quota";

describe("effectiveLegQuota", () => {
  it("uses the group quota on a normal round", () => {
    assert.equal(effectiveLegQuota({ legsPerMember: 1 }), 1);
    assert.equal(effectiveLegQuota({ legsPerMember: 3 }), 3);
  });

  it("uses SOLO_MAX_LEGS on a solo round, ignoring the snapshot quota", () => {
    assert.equal(
      effectiveLegQuota({ legsPerMember: 1, unlimitedLegs: true }),
      SOLO_MAX_LEGS
    );
    assert.equal(
      effectiveLegQuota({ legsPerMember: 3, unlimitedLegs: true }),
      SOLO_MAX_LEGS
    );
  });

  it("treats a missing flag as a normal round", () => {
    assert.equal(
      effectiveLegQuota({ legsPerMember: 2, unlimitedLegs: false }),
      2
    );
    assert.equal(effectiveLegQuota({ legsPerMember: 2 }), 2);
  });
});

describe("solo quota via allMembersFilledQuota", () => {
  const solo = { legsPerMember: 1, unlimitedLegs: true };
  const legs = (count: number) =>
    Array.from({ length: count }, () => ({ userId: "u1" }));

  it("does not lock a solo round below the cap", () => {
    for (const count of [1, 2, 5, SOLO_MAX_LEGS - 1]) {
      assert.equal(
        allMembersFilledQuota({
          memberUserIds: ["u1"],
          legs: legs(count),
          legsPerMember: effectiveLegQuota(solo),
        }),
        false,
        `${count} legs should not lock`
      );
    }
  });

  it("locks a solo round once the cap is reached", () => {
    assert.equal(
      allMembersFilledQuota({
        memberUserIds: ["u1"],
        legs: legs(SOLO_MAX_LEGS),
        legsPerMember: effectiveLegQuota(solo),
      }),
      true
    );
  });

  it("still locks a one-member group at quota when not solo-flagged", () => {
    assert.equal(
      allMembersFilledQuota({
        memberUserIds: ["u1"],
        legs: legs(1),
        legsPerMember: effectiveLegQuota({ legsPerMember: 1 }),
      }),
      true
    );
  });
});

describe("openRoundReadyToLock", () => {
  const members = ["u1", "u2"];
  const full = [
    { userId: "u1", outcome: "pending" },
    { userId: "u2", outcome: "pending" },
  ];

  it("locks once every member has filled their quota", () => {
    assert.equal(
      openRoundReadyToLock({ reopened: false, memberUserIds: members, legs: full, legsPerMember: 1 }),
      true
    );
    assert.equal(
      openRoundReadyToLock({ reopened: false, memberUserIds: members, legs: full.slice(0, 1), legsPerMember: 1 }),
      false
    );
  });

  it("waits while a void pick can still be swapped", () => {
    const withVoid = [full[0]!, { userId: "u2", outcome: "void" }];
    assert.equal(
      openRoundReadyToLock({ reopened: false, memberUserIds: members, legs: withVoid, legsPerMember: 1 }),
      false
    );
    assert.equal(
      openRoundReadyToLock({ reopened: true, memberUserIds: members, legs: withVoid, legsPerMember: 1 }),
      false
    );
  });

  it("re-locks a reopened round once no void picks remain, quota or not", () => {
    assert.equal(
      openRoundReadyToLock({ reopened: true, memberUserIds: members, legs: full.slice(0, 1), legsPerMember: 1 }),
      true
    );
  });

  it("never locks an empty round", () => {
    assert.equal(
      openRoundReadyToLock({ reopened: true, memberUserIds: members, legs: [], legsPerMember: 1 }),
      false
    );
  });
});
