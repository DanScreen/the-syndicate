import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SOLO_MAX_LEGS } from "./constants";
import { allMembersFilledQuota, effectiveLegQuota } from "./legs-quota";

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
