import { randomBytes } from "node:crypto";
import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import type { E2EFixture } from "./fixtures-data";

/**
 * Sign-in and sign-up are rate limited per client IP, and every browser in the
 * suite really comes from 127.0.0.1. Giving each context its own forwarded IP
 * keeps users out of each other's buckets — random rather than sequential so
 * repeat runs against a reused local server don't refill the same ones.
 */
export function uniqueIp(): string {
  const [a, b, c] = randomBytes(3);
  return `10.${a}.${b}.${c}`;
}

export async function newActorContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": uniqueIp() } });
}

/** A fresh browser (own cookies, own IP) signed in as `user`. */
export async function signedInPage(
  browser: Browser,
  user: { email: string; password: string },
  landing = "/dashboard"
): Promise<Page> {
  const context = await newActorContext(browser);
  const page = await context.newPage();
  await signIn(page, user, landing);
  await expect(page).toHaveURL(landing);
  return page;
}

export async function signIn(page: Page, user: { email: string; password: string }, callbackUrl?: string) {
  await page.goto(callbackUrl ? `/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/sign-in");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

export async function fillSignUp(
  page: Page,
  user: { firstName: string; lastName: string; email: string; password: string }
) {
  await page.getByLabel("First name").fill(user.firstName);
  await page.getByLabel("Last name").fill(user.lastName);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Date of birth").fill("1990-05-17");
  await page.getByLabel(/^Password/).fill(user.password);
  await page.getByRole("button", { name: "Create account" }).click();
}

/** Creates a group through the UI and returns its id from the URL. */
export async function createGroup(page: Page, name: string): Promise<string> {
  await page.goto("/groups/create");
  await page.getByLabel("Group name").fill(name);
  await page.getByRole("button", { name: "Create group" }).click();
  await expect(page).toHaveURL(/\/groups\/(?!create)[^/]+$/);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  return new URL(page.url()).pathname.split("/").pop()!;
}

/** The leg picker on the group's Bet tab. */
export function legPicker(page: Page) {
  return page.locator("form").filter({ has: page.getByRole("button", { name: "Submit leg" }) });
}

export function fixtureButton(page: Page, fixture: E2EFixture) {
  return legPicker(page).getByRole("button", {
    name: new RegExp(`^${fixture.homeTeam} vs ${fixture.awayTeam}`),
  });
}

/** Opens the picker's fixture list (one enabled competition may be pre-selected). */
export async function showFixtures(page: Page, fixture: E2EFixture) {
  const competition = legPicker(page).getByRole("button", { name: "FIFA World Cup" });
  const fixtureChoice = fixtureButton(page, fixture);
  await expect(competition.or(fixtureChoice)).toBeVisible();
  if (await competition.isVisible()) await competition.click();
  await expect(fixtureChoice).toBeVisible();
}

/** Walks the picker: competition → fixture → match winner → selection. */
export async function pickFixture(page: Page, fixture: E2EFixture) {
  await showFixtures(page, fixture);
  await fixtureButton(page, fixture).click();
}

export async function submitLeg(page: Page, fixture: E2EFixture, selection: string) {
  await pickFixture(page, fixture);
  const form = legPicker(page);
  await form.getByRole("button", { name: "Match Winner" }).click();
  await form.getByRole("button", { name: new RegExp(`^${selection}\\b`) }).click();
  await form.getByRole("button", { name: "Submit leg" }).click();
  // The picker resets when the saved leg lands; picking again before then
  // gets wiped mid-way.
  await expect(
    page.getByRole("listitem").filter({
      hasText: `${fixture.homeTeam} vs ${fixture.awayTeam} · Match Winner: ${selection}`,
    })
  ).toBeVisible();
}

/**
 * Settles a group's locked round from /admin/settlement. The outcome selects
 * are server-rendered, so choosing before hydration changes the DOM but not
 * React state — retry until the card agrees every leg has an outcome.
 */
export async function settleRound(
  adminPage: Page,
  groupName: string,
  outcomes: Record<string, "won" | "lost" | "void">
) {
  const card = adminPage.locator("div.rounded-xl").filter({
    has: adminPage.getByRole("heading", { name: groupName }),
  });
  const settle = card.getByRole("button", { name: "Settle round & award points" });
  await expect(async () => {
    for (const [selection, outcome] of Object.entries(outcomes)) {
      await card.getByLabel(`Outcome for ${selection}`).selectOption(outcome);
    }
    await expect(settle).toBeEnabled({ timeout: 1_000 });
  }).toPass();
  await settle.click();
  await expect(adminPage.getByRole("heading", { name: groupName })).toHaveCount(0);
}
