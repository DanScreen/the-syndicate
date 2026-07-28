import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { prisma } from "@tiki-acca/database";
import { propagateSelectionOutcomes } from "./propagate-selection-outcome";

const groupIds: string[] = [];
const userIds: string[] = [];

/** Each test gets its own fixture id so pending legs cannot leak between them. */
function uniqueFixtureId(name: string): string {
  return `evt-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const SELECTION = {
  marketType: "corners_over_under_95",
  selectionId: "over",
  marketLabel: "Total Corners O/U 9.5",
  selectionLabel: "Over 9.5",
};

/** One group, one locked round, one leg on the shared selection. */
async function createGroupWithLeg(
  fixtureId: string,
  options?: {
    roundStatus?: string;
    selectionId?: string;
    marketType?: string;
  }
) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const user = await prisma.user.create({
    data: {
      firstName: "Propagate",
      lastName: "Tester",
      name: "Propagate Tester",
      email: `propagate-${suffix}@example.test`,
      passwordHash: "not-a-real-hash",
    },
  });
  userIds.push(user.id);

  const group = await prisma.group.create({
    data: {
      name: `Propagate test ${suffix}`,
      inviteCode: Math.random().toString(36).slice(2, 12),
      ownerId: user.id,
      members: { create: { userId: user.id, role: "owner" } },
      rounds: {
        create: {
          status: options?.roundStatus ?? "locked",
          betNumber: 1,
          lockedAt: new Date(),
          legs: {
            create: {
              userId: user.id,
              fixtureId,
              homeTeam: "France",
              awayTeam: "England",
              competition: "FIFA World Cup",
              kickoff: new Date(Date.now() - 3 * 60 * 60 * 1000),
              marketType: options?.marketType ?? SELECTION.marketType,
              marketLabel: SELECTION.marketLabel,
              selectionId: options?.selectionId ?? SELECTION.selectionId,
              selectionLabel: SELECTION.selectionLabel,
              odds: 1.9,
              bookmakerId: "williamhill",
              bookmakerName: "William Hill",
            },
          },
        },
      },
    },
    include: { rounds: { include: { legs: true } } },
  });
  groupIds.push(group.id);

  const round = group.rounds[0]!;
  return { round, leg: round.legs[0]! };
}

after(async () => {
  await prisma.group.deleteMany({ where: { id: { in: groupIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

describe("selection outcome propagation", () => {
  it("applies an admin's outcome to the same selection in other groups", async () => {
    const fixtureId = uniqueFixtureId("t");
    const source = await createGroupWithLeg(fixtureId);
    const other = await createGroupWithLeg(fixtureId);
    const third = await createGroupWithLeg(fixtureId);

    const result = await propagateSelectionOutcomes([
      {
        legId: source.leg.id,
        fixtureId,
        marketType: SELECTION.marketType,
        selectionId: SELECTION.selectionId,
        outcome: "won",
      },
    ]);

    assert.equal(result.legsUpdated, 2);
    assert.equal(result.affectedRoundIds.length, 2);

    for (const legId of [other.leg.id, third.leg.id]) {
      const leg = await prisma.leg.findUnique({ where: { id: legId } });
      assert.equal(leg?.outcome, "won", "matching leg should take the same outcome");
    }
  });

  it("does not touch a different selection on the same fixture", async () => {
    const fixtureId = uniqueFixtureId("t");
    const source = await createGroupWithLeg(fixtureId);
    const under = await createGroupWithLeg(fixtureId, { selectionId: "under" });
    const otherMarket = await createGroupWithLeg(fixtureId, { marketType: "corners_over_under_105" });

    await propagateSelectionOutcomes([
      {
        legId: source.leg.id,
        fixtureId,
        marketType: SELECTION.marketType,
        selectionId: SELECTION.selectionId,
        outcome: "lost",
      },
    ]);

    for (const legId of [under.leg.id, otherMarket.leg.id]) {
      const leg = await prisma.leg.findUnique({ where: { id: legId } });
      assert.equal(leg?.outcome, "pending", "a different selection must stay pending");
    }
  });

  it("leaves open rounds alone — they lock at first kickoff", async () => {
    const fixtureId = uniqueFixtureId("t");
    const source = await createGroupWithLeg(fixtureId);
    const open = await createGroupWithLeg(fixtureId, { roundStatus: "open" });

    await propagateSelectionOutcomes([
      {
        legId: source.leg.id,
        fixtureId,
        marketType: SELECTION.marketType,
        selectionId: SELECTION.selectionId,
        outcome: "won",
      },
    ]);

    const leg = await prisma.leg.findUnique({ where: { id: open.leg.id } });
    assert.equal(leg?.outcome, "pending");
  });

  it("never rewrites a leg that already has an outcome", async () => {
    const fixtureId = uniqueFixtureId("t");
    const source = await createGroupWithLeg(fixtureId);
    const other = await createGroupWithLeg(fixtureId);

    await prisma.leg.update({
      where: { id: other.leg.id },
      data: { outcome: "void" },
    });

    const result = await propagateSelectionOutcomes([
      {
        legId: source.leg.id,
        fixtureId,
        marketType: SELECTION.marketType,
        selectionId: SELECTION.selectionId,
        outcome: "won",
      },
    ]);

    assert.equal(result.legsUpdated, 0);
    const leg = await prisma.leg.findUnique({ where: { id: other.leg.id } });
    assert.equal(leg?.outcome, "void");
  });

  it("is idempotent — a second run updates nothing", async () => {
    const fixtureId = uniqueFixtureId("t");
    const source = await createGroupWithLeg(fixtureId);
    await createGroupWithLeg(fixtureId);

    const selection = {
      legId: source.leg.id,
      fixtureId,
      marketType: SELECTION.marketType,
      selectionId: SELECTION.selectionId,
      outcome: "won" as const,
    };

    const first = await propagateSelectionOutcomes([selection]);
    const second = await propagateSelectionOutcomes([selection]);

    assert.equal(first.legsUpdated, 1);
    assert.equal(second.legsUpdated, 0, "re-running must not double-apply");
  });
});
