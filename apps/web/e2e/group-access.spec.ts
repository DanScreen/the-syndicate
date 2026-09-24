import { signIn, signedInPage } from "./support/actors";
import { createGroupWithMembers, createUser } from "./support/db";
import { E2E_PASSWORD } from "./support/env";
import { expect, test } from "./support/test";

test.describe("joining and group access", () => {
  test("an existing user joins by typing the invite code", async ({ page }) => {
    const owner = await createUser("Owner");
    const joiner = await createUser("Joiner");
    const group = await createGroupWithMembers(owner, []);

    await signIn(page, joiner, "/groups/join");
    await expect(page).toHaveURL("/groups/join");
    await page.getByLabel("Invite code").fill(group.inviteCode.toLowerCase());
    await page.getByRole("button", { name: "Join group" }).click();

    await expect(page).toHaveURL(`/groups/${group.id}`);
    await expect(page.getByRole("heading", { level: 1, name: group.name })).toBeVisible();
    await expect(page.getByText(/2 members/)).toBeVisible();
    // A second member turns the owner's solo acca into a group acca.
    await expect(page.getByText("Build your acca — up to 10 legs")).toHaveCount(0);
  });

  test("a wrong invite code is rejected", async ({ page }) => {
    const user = await createUser("Lost");
    await signIn(page, user, "/groups/join");
    await expect(page).toHaveURL("/groups/join");
    await page.getByLabel("Invite code").fill("NOPE0000");
    await page.getByRole("button", { name: "Join group" }).click();
    await expect(page.getByText("Invalid invite code")).toBeVisible();
  });

  test("an invite link for a group you're already in takes you to it", async ({ page }) => {
    const owner = await createUser("Owner");
    const member = await createUser("Member");
    const group = await createGroupWithMembers(owner, [member]);

    await signIn(page, member, `/groups/join?code=${group.inviteCode}`);
    await expect(page).toHaveURL(`/groups/${group.id}`);
  });

  test("a non-member can't open someone else's group", async ({ browser }) => {
    const owner = await createUser("Owner");
    const outsider = await createUser("Outsider");
    const group = await createGroupWithMembers(owner, []);

    const page = await signedInPage(browser, { email: outsider.email, password: E2E_PASSWORD });
    await page.goto(`/groups/${group.id}`);
    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByText(group.name)).toHaveCount(0);

    await page.goto(`/groups/${group.id}/chat`);
    await expect(page).toHaveURL("/dashboard");
    await page.context().close();
  });
});
