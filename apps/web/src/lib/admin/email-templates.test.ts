import assert from "node:assert/strict";
import { test } from "node:test";
import { messageReportedEmail } from "./email-templates";

const base = {
  messageId: "msg_1",
  authorName: "Sam",
  groupName: "Dog & Duck FC",
  body: "hello",
  reason: "spam",
};

test("messageReportedEmail renders in the branded layout", () => {
  const doc = messageReportedEmail(base);
  assert.equal(doc.subject, "Chat message reported in Dog & Duck FC");
  assert.match(doc.html, /^<!DOCTYPE html>/);
  assert.match(doc.html, /brand\/email-logo\.png/);
  assert.match(doc.html, /Dog &amp; Duck FC/);
  // Moderation alerts aren't governed by notification preferences
  assert.doesNotMatch(doc.html, /Manage notification preferences/);
  assert.match(doc.text, /Reason: spam/);
});

test("messageReportedEmail escapes the reported message, author and reason", () => {
  const doc = messageReportedEmail({
    ...base,
    authorName: "<i>Sam</i>",
    body: '<img src=x onerror="alert(1)">',
    reason: "<script>",
  });
  assert.doesNotMatch(doc.html, /<img src=x/);
  assert.doesNotMatch(doc.html, /<script>/);
  assert.doesNotMatch(doc.html, /<i>Sam<\/i>/);
  assert.match(doc.html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
});

test("messageReportedEmail trims long messages and fills in blanks", () => {
  const doc = messageReportedEmail({ ...base, authorName: null, reason: null, body: "x".repeat(300) });
  assert.match(doc.text, new RegExp(`Message: ${"x".repeat(200)}…`));
  assert.match(doc.text, /Author: Unknown member/);
  assert.match(doc.text, /Reason: No reason given/);
});
