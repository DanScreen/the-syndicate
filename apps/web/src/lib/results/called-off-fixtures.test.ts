import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { prisma } from "@tiki-acca/database";
import { calledOffFixtureIds, isFixtureCalledOff } from "./called-off-fixtures";

const matchIds: string[] = [];
const DAY_MS = 24 * 60 * 60 * 1000;

after(async () => {
  await prisma.match.deleteMany({ where: { id: { in: matchIds } } });
  await prisma.$disconnect();
});

async function createMatch(data: {
  competitionId: string;
  kickoff: Date;
  homeTeam: string;
  awayTeam: string;
  status: string;
  externalOddsId?: string;
}) {
  const match = await prisma.match.create({ data });
  matchIds.push(match.id);
  return match;
}

describe("calledOffFixtureIds", () => {
  it("finds postponed matches by odds id or by teams on the kickoff day", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const competitionId = `called-off-${suffix}`;
    const kickoff = new Date(Date.now() + 2 * DAY_MS);

    await createMatch({
      competitionId,
      kickoff,
      homeTeam: "Leeds United",
      awayTeam: "Hull City",
      status: "POSTPONED",
      externalOddsId: `evt-linked-${suffix}`,
    });
    await createMatch({
      competitionId,
      kickoff,
      homeTeam: "Bolton Wanderers",
      awayTeam: "Wigan Athletic",
      status: "CANCELLED",
    });
    await createMatch({
      competitionId,
      kickoff,
      homeTeam: "Stockport County",
      awayTeam: "Barnsley",
      status: "SCHEDULED",
    });
    // Same teams, but the postponement was for a different day.
    await createMatch({
      competitionId,
      kickoff: new Date(kickoff.getTime() + 7 * DAY_MS),
      homeTeam: "Port Vale",
      awayTeam: "Crewe Alexandra",
      status: "POSTPONED",
    });

    const fixtures = [
      { id: `evt-linked-${suffix}`, homeTeam: "Leeds", awayTeam: "Hull", kickoff: kickoff.toISOString() },
      { id: `evt-teams-${suffix}`, homeTeam: "Bolton Wanderers", awayTeam: "Wigan Athletic", kickoff },
      { id: `evt-on-${suffix}`, homeTeam: "Stockport County", awayTeam: "Barnsley", kickoff },
      { id: `evt-other-day-${suffix}`, homeTeam: "Port Vale", awayTeam: "Crewe Alexandra", kickoff },
    ];

    const ids = await calledOffFixtureIds(competitionId, fixtures);

    assert.deepEqual([...ids].sort(), [`evt-linked-${suffix}`, `evt-teams-${suffix}`].sort());
    assert.equal(await isFixtureCalledOff(competitionId, fixtures[1]!), true);
    assert.equal(await isFixtureCalledOff(competitionId, fixtures[2]!), false);
  });

  it("returns nothing for an empty fixture list", async () => {
    assert.equal((await calledOffFixtureIds("none", [])).size, 0);
  });
});
