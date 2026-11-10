import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AVATAR_COLORS,
  formatWaitingOnNames,
  getAvatarColor,
  getFirstName,
  getInitials,
} from "./member-display";

describe("getInitials", () => {
  it("uses first and last word initials for multi-word names", () => {
    assert.equal(getInitials("Tom Smith"), "TS");
    assert.equal(getInitials("mary jane watson"), "MW");
  });

  it("uses the first two letters of a single word", () => {
    assert.equal(getInitials("priya"), "PR");
    assert.equal(getInitials("Z"), "Z");
  });

  it("trims whitespace and returns ? when empty", () => {
    assert.equal(getInitials("  Tom   Smith  "), "TS");
    assert.equal(getInitials(""), "?");
    assert.equal(getInitials("   "), "?");
  });

  it("keeps an emoji as a whole character", () => {
    assert.equal(getInitials("😎 Tom"), "😎T");
    assert.equal(getInitials("😎"), "😎");
  });
});

describe("getFirstName", () => {
  it("returns the first word, trimmed", () => {
    assert.equal(getFirstName("  Tom Smith "), "Tom");
    assert.equal(getFirstName("Priya"), "Priya");
    assert.equal(getFirstName("   "), "");
  });
});

describe("getAvatarColor", () => {
  it("returns a colour from the palette", () => {
    assert.equal(AVATAR_COLORS.length, 8);
    assert.ok((AVATAR_COLORS as readonly string[]).includes(getAvatarColor("user-123")));
  });

  it("is deterministic for the same seed", () => {
    assert.equal(getAvatarColor("user-abc"), getAvatarColor("user-abc"));
  });

  it("handles the empty seed", () => {
    assert.ok((AVATAR_COLORS as readonly string[]).includes(getAvatarColor("")));
  });
});

describe("formatWaitingOnNames", () => {
  it("returns empty string for no names", () => {
    assert.equal(formatWaitingOnNames([]), "");
  });

  it("uses only the first name for one person", () => {
    assert.equal(formatWaitingOnNames(["Tom Smith"]), "Waiting on Tom");
  });

  it("joins two names with and", () => {
    assert.equal(formatWaitingOnNames(["Tom Smith", "Priya Patel"]), "Waiting on Tom and Priya");
  });

  it("lists three names with a serial comma before and", () => {
    assert.equal(
      formatWaitingOnNames(["Tom Smith", "Priya Patel", "Sam Lee"]),
      "Waiting on Tom, Priya and Sam"
    );
  });

  it("shows two names and a count of the rest when there are more than three", () => {
    assert.equal(
      formatWaitingOnNames(["Tom Smith", "Priya Patel", "Sam Lee", "Ana Diaz", "Joe Bloggs", "Kim Park"]),
      "Waiting on Tom, Priya and 4 others"
    );
    assert.equal(
      formatWaitingOnNames(["Tom Smith", "Priya Patel", "Sam Lee", "Ana Diaz"]),
      "Waiting on Tom, Priya and 2 others"
    );
  });
});
