import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { ApiError, apiErrorMessage, createApiFetcher } from "./api";

describe("apiErrorMessage", () => {
  it("reads plain strings and flattened Zod errors", () => {
    assert.equal(apiErrorMessage("Not a member"), "Not a member");
    assert.equal(apiErrorMessage({ formErrors: ["Too many legs"], fieldErrors: {} }), "Too many legs");
    assert.equal(
      apiErrorMessage({ formErrors: [], fieldErrors: { name: ["Required"] } }),
      "name: Required"
    );
    assert.equal(apiErrorMessage(undefined), "Request failed");
  });
});

describe("createApiFetcher", () => {
  afterEach(() => mock.restoreAll());

  it("prefixes the base URL, sends JSON and adds headers", async () => {
    const fetchMock = mock.method(globalThis, "fetch", async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    const fetcher = createApiFetcher({
      baseUrl: "https://api.test",
      headers: () => ({ Authorization: "Bearer t" }),
    });
    assert.deepEqual(await fetcher("/api/legs", { method: "POST", body: { a: 1 } }), { ok: true });
    const [url, init] = fetchMock.mock.calls[0]!.arguments as [string, RequestInit];
    assert.equal(url, "https://api.test/api/legs");
    assert.equal(init.method, "POST");
    assert.equal(init.body, '{"a":1}');
    assert.deepEqual(init.headers, {
      "Content-Type": "application/json",
      Authorization: "Bearer t",
    });
  });

  it("throws ApiError with the server's message", async () => {
    mock.method(globalThis, "fetch", async () =>
      new Response(JSON.stringify({ error: "Not a member" }), { status: 403 })
    );
    await assert.rejects(createApiFetcher()("/api/groups/x"), (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 403);
      assert.equal(error.message, "Not a member");
      assert.equal(error.code, undefined);
      return true;
    });
  });

  it("carries the server's error code", async () => {
    mock.method(globalThis, "fetch", async () =>
      new Response(JSON.stringify({ error: "Confirm your email", code: "email_unverified" }), {
        status: 403,
      })
    );
    await assert.rejects(createApiFetcher()("/api/groups"), (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.code, "email_unverified");
      return true;
    });
  });
});
