import assert from "node:assert/strict";
import { test } from "node:test";
import { withoutSessionCookie } from "./session-cookie";

test("withoutSessionCookie drops every session cookie variant and keeps the rest", () => {
  const response = new Response(null);
  response.headers.append("set-cookie", "authjs.session-token=stale; Path=/; HttpOnly");
  response.headers.append("set-cookie", "__Secure-authjs.session-token.0=chunk; Path=/; Secure");
  response.headers.append("set-cookie", "__Secure-authjs.session-token.1=chunk; Path=/; Secure");
  response.headers.append("set-cookie", "authjs.csrf-token=abc; Path=/");

  assert.deepEqual(withoutSessionCookie(response).headers.getSetCookie(), ["authjs.csrf-token=abc; Path=/"]);
});

test("withoutSessionCookie leaves a response without a session cookie untouched", () => {
  const response = new Response(null, { status: 307, headers: { location: "/sign-in" } });
  const result = withoutSessionCookie(response);
  assert.equal(result.status, 307);
  assert.equal(result.headers.get("location"), "/sign-in");
});
