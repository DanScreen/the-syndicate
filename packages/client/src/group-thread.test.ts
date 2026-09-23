import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DELETED_MESSAGE_BODY, type RoundMessageDto } from "@tiki-acca/shared";
import { canModerateMessage, mergeMessages } from "./group-thread";

const message = (id: string, createdAt: string, extra: Partial<RoundMessageDto> = {}) =>
  ({ id, createdAt, kind: "user", body: "hi", user: { id: "u2", name: "Sam" }, ...extra }) as RoundMessageDto;

describe("mergeMessages", () => {
  it("dedupes by id, prefers the incoming copy and sorts oldest first", () => {
    const merged = mergeMessages(
      [message("b", "2026-01-01T10:00:00Z"), message("a", "2026-01-01T09:00:00Z")],
      [message("b", "2026-01-01T10:00:00Z", { body: "edited" }), message("c", "2026-01-01T10:00:00Z")]
    );
    assert.deepEqual(merged.map((m) => m.id), ["a", "b", "c"]);
    assert.equal(merged[1]!.body, "edited");
  });
});

describe("canModerateMessage", () => {
  it("only offers report/block on other members' live messages", () => {
    assert.equal(canModerateMessage(message("a", "t"), "u1"), true);
    assert.equal(canModerateMessage(message("a", "t"), "u2"), false);
    assert.equal(canModerateMessage(message("a", "t", { kind: "system" } as Partial<RoundMessageDto>), "u1"), false);
    assert.equal(canModerateMessage(message("a", "t", { body: DELETED_MESSAGE_BODY }), "u1"), false);
  });
});
