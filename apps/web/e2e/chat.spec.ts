import { signedInPage } from "./support/actors";
import { createGroupWithMembers, createUser, uniqueId } from "./support/db";
import { E2E_PASSWORD } from "./support/env";
import { expect, test } from "./support/test";

test("group members chat, and profanity is blocked", async ({ browser }) => {
  const alice = await createUser("Alice");
  const bob = await createUser("Bob");
  const group = await createGroupWithMembers(alice, [bob]);
  const chatPath = `/groups/${group.id}/chat`;

  const alicePage = await signedInPage(browser, { email: alice.email, password: E2E_PASSWORD }, chatPath);
  const message = `Brazil to win it all ${uniqueId()}`;
  const input = alicePage.getByPlaceholder("Say something…");
  await input.fill(message);
  await alicePage.getByRole("button", { name: "Send" }).click();
  await expect(alicePage.getByText(message)).toBeVisible();
  await expect(input).toHaveValue("");

  const bobPage = await signedInPage(browser, { email: bob.email, password: E2E_PASSWORD }, chatPath);
  await expect(bobPage.getByText(message)).toBeVisible();

  await bobPage.getByPlaceholder("Say something…").fill("you lucky bastard");
  await bobPage.getByRole("button", { name: "Send" }).click();
  await expect(bobPage.getByText("Naughty naughty — profanity not allowed")).toBeVisible();

  await alicePage.reload();
  await expect(alicePage.getByText(message)).toBeVisible();
  await expect(alicePage.getByText("you lucky bastard")).toHaveCount(0);

  await alicePage.context().close();
  await bobPage.context().close();
});
