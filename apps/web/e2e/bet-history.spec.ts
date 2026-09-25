import { signIn } from "./support/actors";
import { createGroupWithMembers, createUser, db } from "./support/db";
import { expect, test } from "./support/test";

test("the Bet tab shows settled bets three at a time, with Show more for the rest", async ({
  page,
}) => {
  const owner = await createUser("Historian");
  const group = await createGroupWithMembers(owner, []);
  const base = Date.UTC(2026, 7, 1);
  for (let i = 0; i < 8; i++) {
    await db.round.create({
      data: {
        groupId: group.id,
        status: "settled",
        betNumber: i + 2,
        combinedOdds: 2 + i,
        settledAt: new Date(base + i * 86_400_000),
      },
    });
  }

  await signIn(page, owner, `/groups/${group.id}`);
  await expect(page.getByRole("heading", { level: 1, name: group.name })).toBeVisible();
  // History lives on the Bet tab now, not its own tab.
  await expect(page.getByRole("link", { name: "History", exact: true })).toHaveCount(0);

  const history = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Settled bets" }) });
  const cards = history.locator("article");
  const showMore = history.getByRole("button", { name: "Show more" });

  await expect(cards).toHaveCount(3);
  // Newest first: the latest bet had the highest odds.
  await expect(cards.first()).toContainText("9.00");

  await showMore.click();
  await expect(cards).toHaveCount(6);
  await showMore.click();
  await expect(cards).toHaveCount(8);
  await expect(cards.last()).toContainText("2.00");
  await expect(showMore).toHaveCount(0);

  // Old links to the History tab land on the Bet tab.
  await page.goto(`/groups/${group.id}/history`);
  await expect(page).toHaveURL(`/groups/${group.id}`);
});
