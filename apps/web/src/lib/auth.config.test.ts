import assert from "node:assert/strict";
import { test } from "node:test";
import type { Session } from "next-auth";
import { NextRequest } from "next/server";
import { authConfig } from "./auth.config";

function authorize(path: string, auth: Session | null) {
  const request = new NextRequest(new URL(path, "https://tikiacca.com"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- only the fields the callback reads
  return authConfig.callbacks!.authorized!({ auth, request } as any);
}

function session(isEmailVerified: boolean): Session {
  return { user: { id: "u1", isEmailVerified }, expires: "2099-01-01T00:00:00.000Z" } as Session;
}

test("authorized redirects signed-out visitors to sign-in with their destination", async () => {
  // Must be a Response, not `false`: middleware wraps its own handler, and
  // Auth.js only applies its default sign-in redirect when there isn't one.
  const res = await authorize("/groups/abc?tab=chat", null);
  assert.ok(res instanceof Response);
  assert.equal(
    res.headers.get("location"),
    "https://tikiacca.com/sign-in?callbackUrl=%2Fgroups%2Fabc%3Ftab%3Dchat"
  );
});

test("authorized sends unverified users to the email gate", async () => {
  const res = await authorize("/dashboard", session(false));
  assert.ok(res instanceof Response);
  assert.equal(res.headers.get("location"), "https://tikiacca.com/verify-email?callbackUrl=%2Fdashboard");
});

test("authorized lets verified users and public paths through", async () => {
  assert.equal(await authorize("/groups/abc", session(true)), true);
  assert.equal(await authorize("/groups/join", null), true);
  assert.equal(await authorize("/", null), true);
});
