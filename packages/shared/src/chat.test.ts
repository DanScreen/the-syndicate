import assert from "node:assert/strict";
import { test } from "node:test";
import { postMessageSchema } from "./chat";

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
