import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ActiveRound, GroupDetailResponse, GroupLeg } from "./api-types";
import type { RoundMessageDto } from "./chat";
import { SOLO_MAX_LEGS } from "./constants";
import {
  accaSummaryCopy,
  announcementsByLegId,
  changeLegTitle,
  deriveRoundView,
  firstKickoffOf,
  legAddedCelebration,
  lockedRoundBanner,
} from "./round-view";

const KICKOFF = "2026-09-26T14:00:00.000Z";
const BEFORE = Date.parse(KICKOFF) - 60_000;
const AFTER = Date.parse(KICKOFF) + 60_000;

function leg(id: string, userId: string, overrides: Partial<GroupLeg> = {}): GroupLeg {
  return {
    id,
    user: { id: userId, name: userId },
    legIndex: 1,
    fixtureId: `f-${id}`,
    homeTeam: "Home",
    awayTeam: "Away",
    competition: "EPL",
    kickoff: KICKOFF,
    marketType: "h2h",
    selectionLabel: `Pick ${id}`,
    marketLabel: "Match winner",
    odds: 2,
    bookmakerName: "LegBook",
    outcome: "pending",
    pointsAwarded: 0,
    ...overrides,
  };
}

function round(id: string, overrides: Partial<ActiveRound> = {}): ActiveRound {
  return {
    id,
    betNumber: 1,
    status: "open",
    legsPerMember: 1,
    unlimitedLegs: false,
    combinedOdds: null,
    bestBookmakerId: null,
    legs: [],
    accaBookmakerRankings: null,
    betslipLink: null,
    betslipLinks: null,
    createdAt: KICKOFF,
    ...overrides,
  };
}

function group(rounds: ActiveRound[], overrides: Partial<GroupDetailResponse["group"]> = {}) {
  const data: GroupDetailResponse = {
    group: {
      id: "g1",
      name: "Group",
      inviteCode: "ABCD1234",
      status: "open",
      legsPerMember: 1,
      maxActiveBets: 1,
      owner: { id: "u1", name: "u1" },
      memberCount: 2,
      unreadMessageCount: 0,
      members: [],
      ...overrides,
    },
    leaderboard: [],
    activeRound: rounds[0] ?? null,
    activeRounds: rounds,
    betslipLink: null,
    betslipLinks: null,
    legAnnouncements: [],
    isOwner: true,
    recentRounds: [],
    settledRoundCount: 0,
  };
  return data;
}

describe("deriveRoundView", () => {
  it("selects the requested bet and falls back to the first one", () => {
    const data = group([round("r1"), round("r2", { betNumber: 2 })]);
    assert.equal(deriveRoundView({ data, selectedRoundId: "r2", userId: "u1" }).round?.id, "r2");
    assert.equal(deriveRoundView({ data, selectedRoundId: "gone", userId: "u1" }).round?.id, "r1");
    assert.equal(deriveRoundView({ data, selectedRoundId: null, userId: "u1" }).round?.id, "r1");
  });

  it("falls back to activeRound when activeRounds is empty", () => {
    const data = { ...group([]), activeRound: round("r1") };
    assert.equal(deriveRoundView({ data, selectedRoundId: null, userId: "u1" }).round?.id, "r1");
  });

  it("tracks the member's quota and next slot", () => {
    const data = group([
      round("r1", { legsPerMember: 2, legs: [leg("a", "u1"), leg("b", "u2")] }),
    ]);
    const view = deriveRoundView({ data, selectedRoundId: null, userId: "u1", now: BEFORE });
    assert.equal(view.userLegs.length, 1);
    assert.equal(view.canSubmitMore, true);
    assert.equal(view.nextSlot, 2);
    assert.equal(view.submitTitle, "Submit leg 2 of 2");
    assert.equal(view.showLegIndex, true);
  });

  it("gives solo bets the solo quota", () => {
    const data = group([round("r1", { unlimitedLegs: true })]);
    const view = deriveRoundView({ data, selectedRoundId: null, userId: "u1" });
    assert.equal(view.isSolo, true);
    assert.equal(view.legsPerMember, SOLO_MAX_LEGS);
    assert.equal(view.submitTitle, "Add leg 1");
  });

  it("never lets a signed-out viewer submit", () => {
    const data = group([round("r1")]);
    assert.equal(deriveRoundView({ data, selectedRoundId: null, userId: null }).canSubmitMore, false);
  });

  it("closes the edit window at first kickoff", () => {
    const data = group([round("r1", { legs: [leg("a", "u1")] })]);
    const before = deriveRoundView({ data, selectedRoundId: null, userId: "u1", now: BEFORE });
    const after = deriveRoundView({ data, selectedRoundId: null, userId: "u1", now: AFTER });
    assert.equal(before.editWindowOpen, true);
    assert.equal(before.accaStarted, false);
    assert.equal(after.editWindowOpen, false);
    assert.equal(after.accaStarted, true);
    assert.equal(after.acca.compareDefaultOpen, false);
  });

  it("prices an open bet only once rankings exist", () => {
    const legs = [leg("a", "u1")];
    const unpriced = group([round("r1", { legs })]);
    assert.equal(deriveRoundView({ data: unpriced, selectedRoundId: null, userId: "u1" }).acca.show, false);

    const priced = group([
      round("r1", {
        legs,
        betslipLink: "https://book/slip",
        accaBookmakerRankings: [
          { bookmakerId: "bk", bookmakerName: "Book", combinedOdds: 3.5 },
        ],
      }),
    ]);
    const view = deriveRoundView({ data: priced, selectedRoundId: null, userId: "u1" });
    assert.equal(view.acca.show, true);
    assert.equal(view.acca.combinedOdds, 3.5);
    assert.equal(view.acca.bookmakerName, "Book");
    assert.equal(view.acca.betslipLink, "https://book/slip");
  });

  it("hides betslip links on a locked bet once a result is in", () => {
    const base = {
      status: "locked" as const,
      combinedOdds: 4,
      bestBookmakerId: "bk",
      betslipLink: "https://book/slip",
    };
    const fresh = group([round("r1", { ...base, legs: [leg("a", "u1"), leg("b", "u2")] })]);
    const freshView = deriveRoundView({ data: fresh, selectedRoundId: null, userId: "u1" });
    assert.equal(freshView.showOpenLinks, true);
    assert.equal(freshView.acca.betslipLink, "https://book/slip");
    assert.equal(freshView.acca.bookmakerName, "LegBook");
    assert.equal(freshView.lockedBanner, "Acca locked. Place your bet at the bookmaker.");

    const started = group([
      round("r1", { ...base, legs: [leg("a", "u1", { outcome: "won" }), leg("b", "u2")] }),
    ]);
    const startedView = deriveRoundView({ data: started, selectedRoundId: null, userId: "u1" });
    assert.equal(startedView.showOpenLinks, false);
    assert.equal(startedView.acca.betslipLink, null);
    assert.equal(startedView.lockedBanner, "Acca in progress: 1 of 2 legs settled");
  });

  it("only allows a new bet under the cap and with no empty open bet", () => {
    const withLegs = round("r1", { legs: [leg("a", "u1")] });
    const view = deriveRoundView({
      data: group([withLegs], { maxActiveBets: 2 }),
      selectedRoundId: null,
      userId: "u1",
    });
    assert.equal(view.canCreateRound, true);

    const empty = deriveRoundView({
      data: group([round("r1")], { maxActiveBets: 2 }),
      selectedRoundId: null,
      userId: "u1",
    });
    assert.equal(empty.canCreateRound, false);
    assert.equal(empty.showEmptyBetHint, true);

    const single = deriveRoundView({ data: group([withLegs]), selectedRoundId: null, userId: "u1" });
    assert.equal(single.canCreateRound, false);
    assert.equal(single.showEmptyBetHint, false);
  });
});

describe("void picks", () => {
  const LATER = "2026-09-26T16:00:00.000Z";

  it("ignores void legs for the first kickoff", () => {
    const first = firstKickoffOf([
      { kickoff: KICKOFF, outcome: "void" },
      { kickoff: LATER, outcome: "pending" },
    ]);
    assert.equal(first?.toISOString(), LATER);
    assert.equal(firstKickoffOf([{ kickoff: KICKOFF, outcome: "void" }]), null);
  });

  it("lets the owner swap a void pick on a reopened bet, but not add or remove", () => {
    const data = group([
      round("r1", {
        reopenedAt: KICKOFF,
        legs: [
          leg("a", "u1", { outcome: "void", homeTeam: "Leeds", awayTeam: "Hull" }),
          leg("b", "u2", { kickoff: LATER }),
        ],
      }),
    ]);
    const view = deriveRoundView({ data, selectedRoundId: null, userId: "u1", now: BEFORE });
    assert.equal(view.reopened, true);
    assert.equal(view.canSubmitMore, false);
    assert.equal(view.canRemove, false);
    assert.equal(view.firstKickoff?.toISOString(), LATER);
    assert.deepEqual(view.swappableVoidLegs.map((l) => l.id), ["a"]);
    assert.match(view.voidBanner ?? "", /^Bet reopened: Leeds vs Hull was postponed or cancelled\. You can swap your pick until /);
    assert.equal(changeLegTitle(view, "a"), "Swap your void pick");

    const mate = deriveRoundView({ data, selectedRoundId: null, userId: "u2", now: BEFORE });
    assert.match(mate.voidBanner ?? "", /u1 can swap their pick until /);
  });

  it("shows no swap once the remaining legs have kicked off", () => {
    const data = group([
      round("r1", { legs: [leg("a", "u1", { outcome: "void" }), leg("b", "u2", { kickoff: LATER })] }),
    ]);
    const view = deriveRoundView({ data, selectedRoundId: null, userId: "u1", now: Date.parse(LATER) + 1 });
    assert.deepEqual(view.swappableVoidLegs, []);
    assert.equal(view.voidBanner, null);
  });

  it("prices a locked bet without a leg that went void after lock", () => {
    const data = group([
      round("r1", {
        status: "locked",
        combinedOdds: 4,
        bestBookmakerId: "bk",
        betslipLink: "https://book/slip",
        accaBookmakerRankings: [{ bookmakerId: "bk", bookmakerName: "Book", combinedOdds: 4 }],
        legs: [leg("a", "u1", { outcome: "void" }), leg("b", "u2", { kickoff: LATER })],
      }),
    ]);
    const view = deriveRoundView({ data, selectedRoundId: null, userId: "u1", now: BEFORE });
    assert.equal(view.acca.combinedOdds, 2);
    assert.deepEqual(view.acca.rankings, [], "stale per-bookmaker odds are dropped");
    assert.equal(view.acca.bookmakerName, "Book");
    assert.equal(view.acca.legCount, 1);
    assert.equal(view.acca.betslipLink, "https://book/slip", "a void pick isn't a result");
    assert.equal(view.showOpenLinks, true);
  });
});

describe("lockedRoundBanner", () => {
  it("describes progress through the results", () => {
    assert.equal(lockedRoundBanner(0, 3), "Acca locked. Place your bet at the bookmaker.");
    assert.equal(lockedRoundBanner(2, 3), "Acca in progress: 2 of 3 legs settled");
    assert.equal(lockedRoundBanner(3, 3), "All legs settled. Acca will finalize shortly.");
  });
});

describe("changeLegTitle", () => {
  it("names the leg only when members pick more than one", () => {
    const legs = [leg("a", "u1", { legIndex: 2 })];
    const multi = deriveRoundView({
      data: group([round("r1", { legsPerMember: 2, legs })]),
      selectedRoundId: null,
      userId: "u1",
    });
    assert.equal(changeLegTitle(multi, "a"), "Change leg 2");
    const single = deriveRoundView({
      data: group([round("r1", { legs })]),
      selectedRoundId: null,
      userId: "u1",
    });
    assert.equal(changeLegTitle(single, "a"), undefined);
  });
});

describe("announcementsByLegId", () => {
  it("keeps the last submit/change message per leg", () => {
    const message = (id: string, legId: string | null, eventType: string) =>
      ({ id, legId, eventType }) as unknown as RoundMessageDto;
    const byLeg = announcementsByLegId([
      message("m1", "a", "leg_submitted"),
      message("m2", "a", "leg_changed"),
      message("m3", "b", "round_locked"),
      message("m4", null, "leg_submitted"),
    ]);
    assert.deepEqual([...byLeg.keys()], ["a"]);
    assert.equal(byLeg.get("a")?.id, "m2");
  });
});

describe("legAddedCelebration", () => {
  it("celebrates a full quota differently", () => {
    assert.equal(legAddedCelebration(1, 2), "Leg added");
    assert.equal(legAddedCelebration(2, 2), "All legs added");
  });
});

describe("accaSummaryCopy", () => {
  const base = {
    inProgress: false,
    preview: true,
    bookmakerName: "Book",
    topBookmakerName: "Top",
    linkQuality: "deeplink" as const,
    legCount: 1,
    hasAllLegLinks: true,
    singleBookmaker: true,
  };

  it("labels live and locked odds", () => {
    assert.equal(accaSummaryCopy(base).oddsLabel, "Current combined odds");
    assert.equal(accaSummaryCopy(base).bookmakerLine, "Best so far at Book");
    const locked = accaSummaryCopy({ ...base, inProgress: true, preview: false });
    assert.equal(locked.oddsLabel, "Locked combined odds");
    assert.equal(locked.bookmakerLine, "Locked at Book");
    assert.equal(locked.previewNote, null);
  });

  it("names the top bookmaker while open and the locked one once locked", () => {
    assert.equal(accaSummaryCopy(base).ctaLabel, "Open betslip · Top");
    assert.equal(
      accaSummaryCopy({ ...base, inProgress: true, preview: false }).ctaLabel,
      "Open betslip · Book"
    );
  });

  it("explains multi-leg and hub links", () => {
    const multi = accaSummaryCopy({ ...base, legCount: 3 });
    assert.equal(multi.ctaLabel, "Open first pick · Top");
    assert.match(multi.ctaHint ?? "", /Use Open on each pick below/);
    const hub = accaSummaryCopy({ ...base, linkQuality: "hub" });
    assert.equal(hub.ctaLabel, "Open Top");
    assert.match(hub.ctaHint ?? "", /football section/);
  });
});
