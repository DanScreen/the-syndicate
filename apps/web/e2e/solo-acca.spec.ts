import { createGroup, fixtureButton, showFixtures, signIn, submitLeg } from "./support/actors";
import { createUser, uniqueId } from "./support/db";
import { E2E_FIXTURES } from "./support/fixtures-data";
import { expect, test } from "./support/test";

const { spainGhana, englandChile, italyPeru } = E2E_FIXTURES;

test("a solo member builds a multi-leg acca, drops a leg and locks it", async ({ page }) => {
  const user = await createUser("Solo");
  await signIn(page, user, "/dashboard");
  await expect(page).toHaveURL("/dashboard");

  // Created through the UI: a new group's first acca must open solo.
  await createGroup(page, `Solo ${uniqueId()}`);
  await expect(page.getByText("Build your acca — up to 10 legs")).toBeVisible();

  await submitLeg(page, spainGhana, "Spain");
  await submitLeg(page, englandChile, "England");
  await submitLeg(page, italyPeru, "Italy");

  const picks = page.getByRole("listitem").filter({ hasText: "Match Winner:" });
  await expect(picks).toHaveCount(3);
  // A solo acca stays open after each pick until the member locks it.
  await expect(page.getByText(/Bet Open/)).toBeVisible();

  await showFixtures(page, spainGhana);
  await expect(fixtureButton(page, spainGhana)).toBeDisabled();
  await expect(fixtureButton(page, spainGhana)).toContainText("(already in acca)");

  page.once("dialog", (dialog) => dialog.accept());
  await picks.filter({ hasText: "England vs Chile" }).getByRole("button", { name: "Remove" }).click();
  await expect(picks).toHaveCount(2);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Lock acca (2 legs)" }).click();
  await expect(page.getByText(/Bet Locked/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Lock acca/ })).toHaveCount(0);
  // Spain 1.50 × Italy 1.90
  await expect(page.getByText("2.85", { exact: true }).first()).toBeVisible();
});
