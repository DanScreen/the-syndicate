import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ageInYears,
  isValidDateOfBirth,
  meetsMinimumAge,
  MIN_SIGN_UP_AGE,
} from "./age";

// Fixed "today" so the tests are deterministic regardless of when they run.
const TODAY = new Date("2026-07-17T12:00:00Z");

test("validates real calendar dates", () => {
  assert.equal(isValidDateOfBirth("2000-01-01"), true);
  assert.equal(isValidDateOfBirth("2000-02-29"), true); // 2000 is a leap year
  assert.equal(isValidDateOfBirth("2001-02-29"), false); // 2001 is not
  assert.equal(isValidDateOfBirth("2000-13-01"), false); // bad month
  assert.equal(isValidDateOfBirth("2000-00-10"), false); // bad month
  assert.equal(isValidDateOfBirth("2000-04-31"), false); // April has 30 days
  assert.equal(isValidDateOfBirth("01-01-2000"), false); // wrong format
  assert.equal(isValidDateOfBirth("not-a-date"), false);
  assert.equal(isValidDateOfBirth(""), false);
});

test("computes whole years of age", () => {
  assert.equal(ageInYears("2000-07-17", TODAY), 26); // birthday is today
  assert.equal(ageInYears("2000-07-18", TODAY), 25); // birthday tomorrow
  assert.equal(ageInYears("2000-07-16", TODAY), 26); // birthday yesterday
  assert.equal(ageInYears("bad-date", TODAY), null);
});

test("enforces the minimum sign-up age", () => {
  assert.equal(MIN_SIGN_UP_AGE, 18);
  // Exactly 18 today — allowed.
  assert.equal(meetsMinimumAge("2008-07-17", TODAY), true);
  // Turns 18 tomorrow — blocked.
  assert.equal(meetsMinimumAge("2008-07-18", TODAY), false);
  // Comfortably over 18.
  assert.equal(meetsMinimumAge("1990-01-01", TODAY), true);
  // Clearly under 18.
  assert.equal(meetsMinimumAge("2015-01-01", TODAY), false);
  // Invalid date is never treated as meeting the age gate.
  assert.equal(meetsMinimumAge("2001-02-29", TODAY), false);
});
