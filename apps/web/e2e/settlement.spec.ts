import { settleRound, signedInPage, submitLeg } from "./support/actors";
import { createGroupWithMembers, createUser } from "./support/db";
import { E2E_ADMIN, E2E_PASSWORD } from "./support/env";
import { E2E_FIXTURES } from "./support/fixtures-data";
import { expect, test } from "./support/test";

const { germanyMexico, portugalKorea } = E2E_FIXTURES;

test("one losing leg sinks the acca but the winner keeps their leg points", async ({ browser }) => {
  const alice = await createUser("Alice");
  const bob = await createUser("Bob");
  const group = await createGroupWithMembers(alice, [bob]);
  const groupPath = `/groups/${group.id}`;

  const alicePage = await signedInPage(browser, { email: alice.email, password: E2E_PASSWORD }, groupPath);
  await submitLeg(alicePage, germanyMexico, "Germany");
  const bobPage = await signedInPage(browser, { email: bob.email, password: E2E_PASSWORD }, groupPath);
  await submitLeg(bobPage, portugalKorea, "Portugal");
  await expect(bobPage.getByText(/Bet Locked/)).toBeVisible();

  const adminPage = await signedInPage(browser, { email: E2E_ADMIN.email, password: E2E_PASSWORD }, "/admin/settlement");
  await settleRound(adminPage, group.name, { Germany: "won", Portugal: "lost" });

  // Group: −1 for the lost acca. Members: Germany won at 2.20 → +1.2, Portugal lost → −1.
  for (const [page, own] of [
    [alicePage, "1.2"],
    [bobPage, "-1"],
  ] as const) {
    await page.goto("/dashboard");
    const summary = page.getByRole("link").filter({ hasText: group.name });
    await expect(summary.getByText("Group points: -1 pts")).toBeVisible();
    await expect(summary.getByText(`Your points: ${own} pts`)).toBeVisible();
  }

  for (const page of [alicePage, bobPage, adminPage]) await page.context().close();
});
