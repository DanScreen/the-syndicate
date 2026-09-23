import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NOTIFICATION_PREFERENCE_SECTIONS } from "./copy";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "./notification-types";

describe("NOTIFICATION_PREFERENCE_SECTIONS", () => {
  it("lists every preference exactly once, in its channel's section", () => {
    const keys = NOTIFICATION_PREFERENCE_SECTIONS.flatMap((section) =>
      section.items.map((item) => {
        assert.ok(item.key.startsWith(section.channel), `${item.key} in ${section.channel}`);
        return item.key;
      })
    );
    assert.deepEqual(
      [...keys].sort(),
      Object.keys(DEFAULT_NOTIFICATION_PREFERENCES).sort()
    );
  });
});
