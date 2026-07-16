import assert from "node:assert/strict";
import { test } from "node:test";
import { containsProfanity } from "./profanity";

const BLOCKED = [
  // Plain profanity.
  "fuck",
  "shit",
  "Twat",
  "Dick",
  "asshole",
  "bitch",
  // Leetspeak / symbol substitution.
  "Sh1t",
  "@sshole",
  "f4ggot",
  // Spaced or punctuated single words.
  "F U C K",
  "s.h.i.t",
  // Severe slurs, including when spaced apart or embedded.
  "n i g g e r",
  "nigger",
  "faggotry",
  // Profanity appearing alongside otherwise-fine words.
  "cockburn dick",
];

const ALLOWED = [
  // Real place / surnames that embed rude substrings (Scunthorpe problem).
  "Scunthorpe",
  "Cockburn",
  "Cassandra",
  "Cocoon",
  "Assange",
  "Weiner",
  "Shitake", // deliberate near-miss: not a standalone "shit" token
  // Ordinary names and group names.
  "Daniel",
  "Screen",
  "The Syndicate",
  "Manchester United Fans",
  "Class of 92",
];

test("blocks profane input", () => {
  for (const value of BLOCKED) {
    assert.equal(containsProfanity(value), true, `expected blocked: "${value}"`);
  }
});

test("allows legitimate names and group names", () => {
  for (const value of ALLOWED) {
    assert.equal(containsProfanity(value), false, `expected allowed: "${value}"`);
  }
});

test("handles empty and whitespace-only input", () => {
  assert.equal(containsProfanity(""), false);
  assert.equal(containsProfanity("   "), false);
});
