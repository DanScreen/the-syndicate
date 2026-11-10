import assert from "node:assert/strict";
import { test } from "node:test";
import { formatWinRate, getLeaderboardTags } from "./leaderboard-display";

test("formats hit rate as a whole percent", () => {
  assert.equal(formatWinRate(5, 1), "83% hit rate");
  assert.equal(formatWinRate(1, 2), "33% hit rate");
  assert.equal(formatWinRate(2, 0), "100% hit rate");
  assert.equal(formatWinRate(0, 4), "0% hit rate");
});

test("hit rate is null when nothing has settled", () => {
  assert.equal(formatWinRate(0, 0), null);
});

const member = (
  userId: string,
  legsWon: number,
  legsLost: number,
  points = 0,
) => ({ userId, points, legsWon, legsLost });

test("no tags with fewer than two members who have 3+ settled legs", () => {
  assert.deepEqual(getLeaderboardTags([]), {});
  assert.deepEqual(getLeaderboardTags([member("a", 5, 0)]), {});
  // Only one eligible member; the other has too few settled legs.
  assert.deepEqual(
    getLeaderboardTags([member("a", 5, 0), member("b", 1, 1)]),
    {},
  );
});

test("ignores members with fewer than three settled legs when picking extremes", () => {
  const tags = getLeaderboardTags([
    member("a", 2, 0), // 100%, but only 2 settled
    member("b", 2, 1),
    member("c", 1, 2),
    member("d", 0, 0),
  ]);
  assert.deepEqual(tags, { b: "Banker", c: "Acca killer" });
});

test("highest hit rate is Banker and lowest is Acca killer", () => {
  const tags = getLeaderboardTags([
    member("a", 5, 1), // 83%
    member("b", 3, 3), // 50%
    member("c", 1, 4), // 20%
  ]);
  assert.deepEqual(tags, { a: "Banker", c: "Acca killer" });
});

test("no tags when the highest and lowest rates are equal", () => {
  const tags = getLeaderboardTags([
    member("a", 3, 3),
    member("b", 6, 6),
    member("c", 0, 0),
  ]);
  assert.deepEqual(tags, {});
});

test("nobody gets Banker when several members tie for the top rate", () => {
  const tags = getLeaderboardTags([
    member("a", 4, 0), // 100%
    member("b", 3, 0), // 100%
    member("c", 1, 2), // 33%
  ]);
  assert.deepEqual(tags, { c: "Acca killer" });
});

test("nobody gets Acca killer when several members tie for the bottom rate", () => {
  const tags = getLeaderboardTags([
    member("a", 4, 0),
    member("b", 1, 2),
    member("c", 2, 4),
  ]);
  assert.deepEqual(tags, { a: "Banker" });
});

test("a tie at both ends yields no tags", () => {
  const tags = getLeaderboardTags([
    member("a", 4, 0),
    member("b", 4, 0),
    member("c", 0, 4),
    member("d", 0, 3),
  ]);
  assert.deepEqual(tags, {});
});

test("two eligible members with different rates get one tag each, never both", () => {
  const tags = getLeaderboardTags([member("a", 3, 0), member("b", 0, 3)]);
  assert.deepEqual(tags, { a: "Banker", b: "Acca killer" });
  assert.equal(Object.values(tags).length, 2);
});
