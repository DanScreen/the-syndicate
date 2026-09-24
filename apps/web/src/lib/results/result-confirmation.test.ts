import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  RESULT_CONFIRMATION_MAX_MS,
  RESULT_CONFIRMATION_MS,
} from "@tiki-acca/shared";
import {
  isMatchResultConfirmed,
  isTerminalMatchStatus,
  matchScoreChanged,
  resultConfirmationRemainingMs,
} from "./result-confirmation";

describe("result confirmation window", () => {
  const now = new Date("2026-09-19T18:00:00.000Z");

  it("treats FINISHED as terminal and IN_PLAY as not", () => {
    assert.equal(isTerminalMatchStatus("FINISHED"), true);
    assert.equal(isTerminalMatchStatus("IN_PLAY"), false);
  });

  it("does not confirm a finished match until the stability window elapses", () => {
    const elapsed = RESULT_CONFIRMATION_MS / 3;
    const match = {
      status: "FINISHED",
      finishedAt: new Date(now.getTime() - elapsed),
      scoreStableSince: new Date(now.getTime() - elapsed),
      scoreLocked: false,
    };
    assert.equal(isMatchResultConfirmed(match, now), false);
    assert.equal(
      resultConfirmationRemainingMs(match, now),
      RESULT_CONFIRMATION_MS - elapsed
    );
  });

  it("confirms after RESULT_CONFIRMATION_MS of score stability", () => {
    const match = {
      status: "FINISHED",
      finishedAt: new Date(now.getTime() - RESULT_CONFIRMATION_MS),
      scoreStableSince: new Date(now.getTime() - RESULT_CONFIRMATION_MS),
      scoreLocked: false,
    };
    assert.equal(isMatchResultConfirmed(match, now), true);
  });

  it("restarts the wait when the FT score changed recently", () => {
    const stableFor = RESULT_CONFIRMATION_MS / 3;
    const match = {
      status: "FINISHED",
      finishedAt: new Date(now.getTime() - 90 * 60 * 1000),
      scoreStableSince: new Date(now.getTime() - stableFor),
      scoreLocked: false,
    };
    assert.equal(isMatchResultConfirmed(match, now), false);
    assert.equal(
      resultConfirmationRemainingMs(match, now),
      RESULT_CONFIRMATION_MS - stableFor
    );
  });

  it("confirms at the max wait even if the score keeps changing", () => {
    const match = {
      status: "FINISHED",
      finishedAt: new Date(now.getTime() - RESULT_CONFIRMATION_MAX_MS),
      scoreStableSince: new Date(now.getTime() - 5 * 60 * 1000),
      scoreLocked: false,
    };
    assert.equal(isMatchResultConfirmed(match, now), true);
    assert.equal(resultConfirmationRemainingMs(match, now), 0);
  });

  it("confirms immediately when the admin locks the score", () => {
    const match = {
      status: "FINISHED",
      finishedAt: now,
      scoreStableSince: now,
      scoreLocked: true,
    };
    assert.equal(isMatchResultConfirmed(match, now), true);
  });

  it("confirms void statuses without waiting", () => {
    const match = {
      status: "POSTPONED",
      finishedAt: null,
      scoreStableSince: null,
      scoreLocked: false,
    };
    assert.equal(isMatchResultConfirmed(match, now), true);
  });

  it("does not confirm FINISHED without finishedAt", () => {
    const match = {
      status: "FINISHED",
      finishedAt: null,
      scoreStableSince: null,
      scoreLocked: false,
    };
    assert.equal(isMatchResultConfirmed(match, now), false);
  });

  it("falls back to finishedAt when scoreStableSince is missing", () => {
    const match = {
      status: "FINISHED",
      finishedAt: new Date(now.getTime() - RESULT_CONFIRMATION_MS),
      scoreLocked: false,
    };
    assert.equal(isMatchResultConfirmed(match, now), true);
  });

  it("detects goal changes for stability resets", () => {
    assert.equal(
      matchScoreChanged(
        { homeGoals: 2, awayGoals: 1 },
        { homeGoals: 1, awayGoals: 1 }
      ),
      true
    );
    assert.equal(
      matchScoreChanged(
        { homeGoals: 1, awayGoals: 0 },
        { homeGoals: 1, awayGoals: 0 }
      ),
      false
    );
  });
});
