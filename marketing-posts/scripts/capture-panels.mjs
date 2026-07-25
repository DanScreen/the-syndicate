/**
 * Capture the two focused UI panels used by the marketing composer.
 *
 * Prerequisites:
 *   1. docker compose up -d
 *   2. cd packages/database && npx tsx prisma/demo-seed.ts
 *   3. npm run dev
 *
 * Run from the repository root:
 *   node marketing-posts/scripts/capture-panels.mjs
 *
 * Override the local web address with MARKETING_BASE_URL when needed.
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const POSTS_ROOT = join(SCRIPT_DIR, "..");
const REPO_ROOT = join(POSTS_ROOT, "..");
const SHOTS = join(POSTS_ROOT, "_raw-screenshots");
const require = createRequire(join(REPO_ROOT, "package.json"));
const sharp = require("sharp");

const BASE_URL = process.env.MARKETING_BASE_URL ?? "http://localhost:3000";
const EMAIL = "danny@demo.tikiacca.com";
const PASSWORD = "DemoPass123!";

async function writeJpeg(locator, filename) {
  await locator.scrollIntoViewIfNeeded();
  const png = await locator.screenshot({
    animations: "disabled",
    caret: "hide",
  });
  await sharp(png)
    .extend({
      top: 28,
      bottom: 28,
      left: 28,
      right: 28,
      background: "#0f1b2d",
    })
    .resize({ width: 1200, withoutEnlargement: false })
    .jpeg({ quality: 94, chromaSubsampling: "4:4:4" })
    .toFile(join(SHOTS, filename));
  console.log("captured", filename);
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1100 },
    deviceScaleFactor: 1,
  });

  await page.goto(`${BASE_URL}/sign-in`, { waitUntil: "networkidle" });
  await page.locator("#signin-email").fill(EMAIL);
  await page.locator("#signin-password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/dashboard(?:\?.*)?$/, { timeout: 15_000 });

  const groupsResponse = await page.request.get(`${BASE_URL}/api/groups`);
  if (!groupsResponse.ok()) {
    throw new Error(`Could not load demo groups (${groupsResponse.status()}).`);
  }
  const groupsBody = await groupsResponse.json();
  const demoGroup = groupsBody.groups?.find((group) => group.name === "The Thursday Club");
  if (!demoGroup) throw new Error("Could not find The Thursday Club in the demo account.");
  const groupHref = `/groups/${demoGroup.id}`;

  await page.goto(`${BASE_URL}${groupHref}/performance`, { waitUntil: "networkidle" });
  const chartTitle = page.getByText("Member points over time", { exact: true });
  await chartTitle.waitFor();
  await page.waitForTimeout(750);
  await writeJpeg(chartTitle.locator(".."), "05b-performance-chart.jpg");

  await page.goto(`${BASE_URL}${groupHref}`, { waitUntil: "networkidle" });
  const compareButton = page.getByRole("button", { name: /Compare bookmakers/ });
  await compareButton.waitFor();
  await page.waitForTimeout(750);
  if ((await compareButton.getAttribute("aria-expanded")) !== "true") {
    await compareButton.click();
    await page.waitForTimeout(250);
  }
  const showAllButton = page.getByRole("button", { name: /Show all \d+ bookmakers/ });
  if (await showAllButton.isVisible()) {
    await showAllButton.click();
    await page.waitForTimeout(250);
  }
  await writeJpeg(compareButton.locator(".."), "07-best-acca-odds.jpg");

  await page.setViewportSize({ width: 520, height: 900 });
  await page.goto(`${BASE_URL}${groupHref}/chat`, { waitUntil: "networkidle" });
  const chatTitle = page.getByRole("heading", { name: "Group Chat" });
  await chatTitle.waitFor();
  await page.addStyleTag({
    content: "nextjs-portal, nav.fixed { display: none !important; }",
  });
  const chatSection = chatTitle.locator("..").locator("..");
  await chatSection.locator("div.overflow-y-auto").evaluate((element) => {
    element.scrollTop = 0;
  });
  await writeJpeg(chatSection, "04a-group-chat.jpg");
} finally {
  await browser.close();
}
