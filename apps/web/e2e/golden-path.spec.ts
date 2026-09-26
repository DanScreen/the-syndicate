import {
  createGroup,
  fillSignUp,
  fixtureButton,
  newActorContext,
  settleRound,
  showFixtures,
  signedInPage,
  submitLeg,
} from "./support/actors";
import { db, mintVerificationPath, uniqueEmail, uniqueId } from "./support/db";
import { E2E_ADMIN, E2E_PASSWORD } from "./support/env";
import { E2E_FIXTURES } from "./support/fixtures-data";
import { expect, test } from "./support/test";

// Each project settles its own pair (see fixtures-data): Alice backs the first
// home side, Bob the second. Both pairs are priced 2.10 and 1.80.
const PICKS = {
  desktop: [E2E_FIXTURES.brazilJapan, E2E_FIXTURES.franceCanada],
  mobile: [E2E_FIXTURES.argentinaNigeria, E2E_FIXTURES.netherlandsQatar],
} as const;

/**
 * The whole product loop, as real people do it: sign up, confirm email, create
 * a group, invite a mate who signs up from the link, both pick, the acca locks,
 * an admin settles it, and points land everywhere they're shown.
 */
test("two friends go from sign-up to a settled, winning acca", async ({ browser }) => {
  const [aliceFixture, bobFixture] = PICKS[test.info().project.name as keyof typeof PICKS];
  const alicePick = aliceFixture.homeTeam;
  const bobPick = bobFixture.homeTeam;
  const groupName = `Golden ${uniqueId()}`;
  const alice = { firstName: "Alice", lastName: "Golden", email: uniqueEmail("alice"), password: E2E_PASSWORD };
  const bob = { firstName: "Bob", lastName: "Golden", email: uniqueEmail("bob"), password: E2E_PASSWORD };

  const aliceContext = await newActorContext(browser);
  const alicePage = await aliceContext.newPage();

  await test.step("Alice signs up and is held at the email gate", async () => {
    await alicePage.goto("/sign-up");
    await fillSignUp(alicePage, alice);
    await expect(alicePage).toHaveURL(/\/verify-email/);
    await expect(alicePage.getByText(alice.email)).toBeVisible();

    await alicePage.goto("/dashboard");
    await expect(alicePage).toHaveURL(/\/verify-email\?callbackUrl=%2Fdashboard/);
  });

  await test.step("Alice confirms her email from the link", async () => {
    await alicePage.goto(await mintVerificationPath(alice.email));
    await expect(alicePage.getByText("Email confirmed — you're all set.")).toBeVisible();
    const continueButton = alicePage.getByRole("button", { name: "Continue" });
    // Enabled only once the session cookie has been re-issued as verified.
    await expect(continueButton).toBeEnabled();
    await continueButton.click();
    await expect(alicePage).toHaveURL("/dashboard");
    await expect(alicePage.getByRole("heading", { name: "Your Groups" })).toBeVisible();
  });

  let groupId = "";
  let inviteCode = "";

  await test.step("Alice creates a group, starts a solo acca and finds the invite", async () => {
    groupId = await createGroup(alicePage, groupName);
    await expect(alicePage.getByText("Build your acca — up to 10 legs")).toBeVisible();

    await submitLeg(alicePage, aliceFixture, alicePick);

    const group = await db.group.findUniqueOrThrow({ where: { id: groupId } });
    inviteCode = group.inviteCode;
    // Every tab fits on screen, owner's Settings included — no sideways scroll.
    const groupTabs = alicePage.locator("nav").filter({
      has: alicePage.getByRole("link", { name: "Invite", exact: true }),
    });
    expect(await groupTabs.evaluate((nav) => nav.scrollWidth <= nav.clientWidth)).toBe(true);
    await alicePage.getByRole("link", { name: "Invite", exact: true }).click();
    await expect(alicePage).toHaveURL(`/groups/${groupId}/invite`);
    await expect(alicePage.getByText(inviteCode, { exact: true })).toBeVisible();
    await expect(alicePage.getByText(`/groups/join?code=${inviteCode}`)).toBeVisible();
    await alicePage.getByRole("link", { name: "Bet", exact: true }).click();
    await expect(alicePage).toHaveURL(`/groups/${groupId}`);
  });

  const bobContext = await newActorContext(browser);
  const bobPage = await bobContext.newPage();

  await test.step("Bob opens the invite link and signs up from it", async () => {
    await bobPage.goto(`/groups/join?code=${inviteCode}`);
    await expect(bobPage.getByText("You've been invited to a Tiki Acca group.")).toBeVisible();
    await bobPage.getByRole("main").getByRole("link", { name: "Sign up" }).click();
    await expect(bobPage).toHaveURL(/\/sign-up\?callbackUrl=/);

    await fillSignUp(bobPage, bob);
    await expect(bobPage).toHaveURL(/\/verify-email\?callbackUrl=%2Fgroups%2Fjoin/);
  });

  await test.step("Bob confirms in another tab and lands in the group", async () => {
    // The emailed link carries no callbackUrl — the waiting tab resumes the join.
    const emailTab = await bobContext.newPage();
    await emailTab.goto(await mintVerificationPath(bob.email));
    await expect(emailTab.getByText("Email confirmed — you're all set.")).toBeVisible();
    // Continue enables once this tab has refreshed the session, which it
    // broadcasts to Bob's other tabs. Closing sooner would abort that.
    await expect(emailTab.getByRole("button", { name: "Continue" })).toBeEnabled();
    await emailTab.close();

    // The waiting tab picks up the verified session and resumes the join.
    await bobPage.bringToFront();
    await expect(bobPage).toHaveURL(`/groups/${groupId}`);
    await expect(bobPage.getByRole("heading", { level: 1, name: groupName })).toBeVisible();
    await expect(bobPage.getByText(/2 members/)).toBeVisible();
  });

  await test.step("Bob can't double up on Alice's fixture, picks his own, and the acca locks", async () => {
    await bobPage.reload();
    await expect(bobPage.getByText("Build your acca — up to 10 legs")).toHaveCount(0);

    await showFixtures(bobPage, aliceFixture);
    await expect(fixtureButton(bobPage, aliceFixture)).toBeDisabled();
    await expect(fixtureButton(bobPage, aliceFixture)).toContainText("(already in acca)");

    await submitLeg(bobPage, bobFixture, bobPick);
    await expect(bobPage.getByText(/Bet Locked/)).toBeVisible();

    await alicePage.reload();
    await expect(alicePage.getByText(/Bet Locked/)).toBeVisible();
  });

  await test.step("An admin settles both legs as won", async () => {
    const adminPage = await signedInPage(browser, { email: E2E_ADMIN.email, password: E2E_PASSWORD }, "/admin/settlement");
    await settleRound(adminPage, groupName, { [alicePick]: "won", [bobPick]: "won" });
    await adminPage.context().close();
  });

  // 2.10 × 1.80 = 3.78 → group +2.78; each member scores their own leg: odds − 1.
  await test.step("Points show on both dashboards", async () => {
    for (const [page, own] of [
      [alicePage, "1.1"],
      [bobPage, "0.8"],
    ] as const) {
      await page.goto("/dashboard");
      const card = page.getByRole("link").filter({ hasText: groupName });
      await expect(card.getByText("Group points: 2.78 pts")).toBeVisible();
      await expect(card.getByText(`Your points: ${own} pts`)).toBeVisible();
    }
  });

  await test.step("The leaderboard ranks Alice first and a new bet is open", async () => {
    await alicePage.goto(`/groups/${groupId}/leaderboard`);
    const rows = alicePage.getByRole("listitem");
    await expect(rows.nth(0)).toContainText("Alice Golden");
    await expect(rows.nth(0)).toContainText("1.1 pts");
    await expect(rows.nth(1)).toContainText("Bob Golden");
    await expect(rows.nth(1)).toContainText("0.8 pts");

    await alicePage.goto(`/groups/${groupId}`);
    await expect(alicePage.getByText(/Bet Open/)).toBeVisible();
  });

  await aliceContext.close();
  await bobContext.close();
});
