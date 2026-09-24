import { signIn } from "./support/actors";
import { createGroupWithMembers, createUser } from "./support/db";
import { expect, test } from "./support/test";

/**
 * The deployed server's auth guards, checked over HTTP: signed-out, signed-in
 * but not allowed, and the cron-only internal routes.
 */
test.describe("API guards", () => {
  test("signed-out requests are rejected", async ({ request }) => {
    expect((await request.get("/api/groups")).status()).toBe(401);
    expect((await request.post("/api/legs", { data: {} })).status()).toBe(401);
    expect((await request.get("/api/admin/stats")).status()).toBe(401);
  });

  test("a signed-in member can't reach admin routes or other groups", async ({ page }) => {
    const owner = await createUser("Owner");
    const user = await createUser("Nosy");
    const group = await createGroupWithMembers(owner, []);

    await signIn(page, user, "/dashboard");
    await expect(page).toHaveURL("/dashboard");

    expect((await page.request.get("/api/groups")).status()).toBe(200);
    expect((await page.request.get("/api/admin/stats")).status()).toBe(403);
    expect((await page.request.get(`/api/groups/${group.id}`)).status()).toBe(403);
    expect((await page.request.get(`/api/groups/${group.id}/messages`)).status()).toBe(403);
  });

  test("internal cron routes need the cron secret", async ({ request }) => {
    const noAuth = await request.post("/api/internal/sync-matches");
    expect(noAuth.status()).toBe(401);
    const wrong = await request.post("/api/internal/sync-matches", {
      headers: { authorization: "Bearer not-the-secret" },
    });
    expect(wrong.status()).toBe(401);
  });
});
