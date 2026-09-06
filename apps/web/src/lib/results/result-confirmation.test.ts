import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RESULT_CONFIRMATION_MS } from "@tiki-acca/shared";

import {
  isMatchResultConfirmed,
  isTerminalMatchStatus,
  resultConfirmationRemainingMs,
} from "./result-confirmation";

describe("result confirmation window", () => {
  const now = new Date("2026-09-06T18:00:00.000Z");

  it("treats FINISHED as terminal", () => {
    assert.equal(isTerminalMatchStatus("FINISHED"), true);
    assert.equal(isTerminalMatchStatus("IN_PLAY"), false);
  });

  it("does not confirm a finished match until the window elapses", () => {
    const match = {
      status: "FINISHED",
      finishedAt: new Date(now.getTime() - 30 * 60 * 1000),
      scoreLocked: false,
    };
    assert.equal(isMatchResultConfirmed(match, now), false);
    assert.equal(
      resultConfirmationRemainingMs(match, now),
      30 * 60 * 1000
    );
  });

  it("confirms after RESULT_CONFIRMATION_MS", () => {
    const match = {
      status: "FINISHED",
      finishedAt: new Date(now.getTime() - RESULT_CONFIRMATION_MS),
      scoreLocked: false,
    };
    assert.equal(isMatchResultConfirmed(match, now), true);
    assert.equal(resultConfirmationRemainingMs(match, now), 0);
  });

  it("confirms immediately when the admin locks the score", () => {
    const match = {
      status: "FINISHED",
      finishedAt: now,
      scoreLocked: true,
    };
    assert.equal(isMatchResultConfirmed(match, now), true);
  });

  it("confirms void statuses without waiting", () => {
    const match = {
      status: "POSTPONED",
      finishedAt: null,
      scoreLocked: false,
    };
    assert.equal(isMatchResultConfirmed(match, now), true);
  });

  it("does not confirm FINISHED without finishedAt", () => {
    const match = {
      status: "FINISHED",
      finishedAt: null,
      scoreLocked: false,
    };
    assert.equal(isMatchResultConfirmed(match, now), false);
  });
});
