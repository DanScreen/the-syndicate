import { fillSignUp, newActorContext, signIn } from "./support/actors";
import { createGroupWithMembers, createUser, mintVerificationPath } from "./support/db";
import { E2E_PASSWORD } from "./support/env";
import { expect, test } from "./support/test";

test.describe("auth gates", () => {
  test("a signed-out deep link survives sign-in", async ({ page }) => {
    const owner = await createUser("Owen");
    const group = await createGroupWithMembers(owner, []);

    await page.goto(`/groups/${group.id}`);
    await expect(page).toHaveURL(`/sign-in?callbackUrl=${encodeURIComponent(`/groups/${group.id}`)}`);

    await page.getByLabel("Email").fill(owner.email);
    await page.getByLabel("Password").fill(owner.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await expect(page).toHaveURL(`/groups/${group.id}`);
    await expect(page.getByRole("heading", { level: 1, name: group.name })).toBeVisible();
  });

  test("a wrong password is rejected without signing in", async ({ page }) => {
    const user = await createUser("Wendy");
    await signIn(page, { email: user.email, password: "not-the-password" });
    await expect(page.getByText("Invalid email or password")).toBeVisible();

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("signing up with a registered email shows an error", async ({ page }) => {
    const existing = await createUser("Ezra");
    await page.goto("/sign-up");
    await fillSignUp(page, { firstName: "Ezra", lastName: "Again", email: existing.email, password: E2E_PASSWORD });
    await expect(page.getByText("Email already registered")).toBeVisible();
    await expect(page).toHaveURL(/\/sign-up/);
  });

  test("an unverified account is held at the email gate until it confirms", async ({ page }) => {
    const user = await createUser("Uma", { verified: false });
    await signIn(page, user, "/dashboard");
    await expect(page).toHaveURL(`/verify-email?callbackUrl=${encodeURIComponent("/dashboard")}`);

    await page.getByRole("button", { name: "I've confirmed it" }).click();
    await expect(page.getByText("Not confirmed yet — tap the link in the email we sent you.")).toBeVisible();

    // Every protected area redirects back here, preserving where they were going.
    await page.goto("/groups/create");
    await expect(page).toHaveURL(`/verify-email?callbackUrl=${encodeURIComponent("/groups/create")}`);

    const link = await mintVerificationPath(user.email);
    await page.goto(link);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL("/dashboard");

    // Re-opening a used link (mail preview, second tap) is harmless…
    await page.goto(link);
    await expect(page.getByText("Email confirmed — you're all set.")).toBeVisible();
    // …but a token that was never issued is refused.
    await page.goto("/verify-email?token=not-a-real-token");
    await expect(page.getByText("This link is invalid or has expired.")).toBeVisible();
  });
});

test("a verification link works signed-out and sends you to sign in", async ({ browser }) => {
  const user = await createUser("Sam", { verified: false });
  const context = await newActorContext(browser);
  const page = await context.newPage();

  await page.goto(await mintVerificationPath(user.email));
  await expect(page.getByText("Email confirmed — you're all set.")).toBeVisible();
  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Fdashboard/);

  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("/dashboard");
  await context.close();
});
