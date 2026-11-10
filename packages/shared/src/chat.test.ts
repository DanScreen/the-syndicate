import assert from "node:assert/strict";
import { test } from "node:test";
import { continuesAuthorRun, postMessageSchema } from "./chat";

test("postMessageSchema rejects reserved and profane bodies", () => {
  assert.equal(postMessageSchema.safeParse({ body: "Nice pick" }).success, true);
  assert.equal(postMessageSchema.safeParse({ body: "Message deleted" }).success, false);
  const profane = postMessageSchema.safeParse({ body: "what the fuck" });
  assert.equal(profane.success, false);
  if (!profane.success) {
    assert.equal(
      profane.error.flatten().fieldErrors.body?.[0],
      "Naughty naughty — profanity not allowed"
    );
  }
});

test("continuesAuthorRun groups close messages from the same author only", () => {
  const msg = (userId: string | null, at: string, kind: "user" | "system" = "user") => ({
    kind,
    user: userId ? { id: userId, name: userId } : null,
    createdAt: at,
  }) as Parameters<typeof continuesAuthorRun>[1];
  const a1 = msg("a", "2026-11-10T09:00:00Z");
  assert.equal(continuesAuthorRun(undefined, a1), false);
  assert.equal(continuesAuthorRun(a1, msg("a", "2026-11-10T09:04:00Z")), true);
  assert.equal(continuesAuthorRun(a1, msg("a", "2026-11-10T09:06:00Z")), false);
  assert.equal(continuesAuthorRun(a1, msg("b", "2026-11-10T09:01:00Z")), false);
  assert.equal(continuesAuthorRun(msg(null, "2026-11-10T09:00:00Z", "system"), a1), false);
});
