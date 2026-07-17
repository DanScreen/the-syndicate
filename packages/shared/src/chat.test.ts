import assert from "node:assert/strict";
import { test } from "node:test";
import { postMessageSchema } from "./chat";

test("postMessageSchema rejects reserved and profane bodies", () => {
  assert.equal(postMessageSchema.safeParse({ body: "Nice pick" }).success, true);
  assert.equal(postMessageSchema.safeParse({ body: "Message deleted" }).success, false);
  assert.equal(postMessageSchema.safeParse({ body: "what the fuck" }).success, false);
});
