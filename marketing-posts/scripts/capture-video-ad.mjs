/**
 * Capture every app screen for the "The Cage" video ad (docs/VIDEO_AD_BRIEF.md §7).
 *
 * For each stage in marketing-posts/video-ad/scenario.json this re-seeds the two
 * demo groups (packages/database/prisma/video-ad-seed.ts), signs in as that
 * stage's member on an iPhone-sized viewport and saves, under
 * marketing-posts/video-ad/captures/<beat>-<stage>/:
 *
 *   screen.png       one phone screen from the group tabs down (as a screen recording would frame it)
 *   screen-odds.png  one phone screen scrolled to the combined odds (betslip stages)
 *   progress.png     status banner (+ who has submitted, while the bet is open)
 *   picks.png        the Picks list
 *   odds.png         the combined odds block
 *   card.png         the settled round card from History (settled stages)
 *
 * It then renders L1, the composite leaderboard (team points, then each
 * player's points), inside the running app so it uses the app's own fonts,
 * colours and components.
 *
 * Every leg and leaderboard row carries the member's profile picture. Drop
 * headshots into marketing-posts/video-ad/avatars/<member key>.(png|jpg|jpeg|webp);
 * any member without one gets a placeholder. The app has no profile pictures
 * today, so avatars are added at capture time: run with --initials for the
 * app exactly as it ships.
 *
 * Prerequisites:
 *   1. docker compose up -d && npm run db:migrate:deploy
 *   2. npm run dev
 *
 * Run from the repository root:
 *   npm run video-ad:capture
 *   npm run video-ad:capture -- --stage=red-locked      one stage only
 *   npm run video-ad:capture -- --initials              no profile pictures
 *   npm run video-ad:capture -- --leaderboard-frames    also export L1 count-up frames
 *
 * Env: MARKETING_BASE_URL (default http://localhost:3000),
 *      MARKETING_CHROMIUM_PATH (optional Chromium executable for Playwright).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const POSTS_ROOT = join(SCRIPT_DIR, "..");
const REPO_ROOT = join(POSTS_ROOT, "..");
const VIDEO_ROOT = join(POSTS_ROOT, "video-ad");
const AVATAR_DIR = join(VIDEO_ROOT, "avatars");
const OUT = join(VIDEO_ROOT, "captures");
const require = createRequire(join(REPO_ROOT, "package.json"));
const sharp = require("sharp");

const scenario = JSON.parse(readFileSync(join(VIDEO_ROOT, "scenario.json"), "utf8"));
const BASE_URL = process.env.MARKETING_BASE_URL ?? "http://localhost:3000";
const args = process.argv.slice(2);
const onlyStage = args.find((a) => a.startsWith("--stage="))?.slice("--stage=".length);
const useAvatars = !args.includes("--initials");
const leaderboardFrames = args.includes("--leaderboard-frames");

// iPhone 15 Pro: 393×852 points at 3× = 1179×2556 pixels.
const PHONE = {
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  colorScheme: "dark",
  locale: "en-GB",
  timezoneId: "Europe/London",
};
const BOTTOM_TAB_BAR = 72;
// Floodlight tokens — keep in sync with docs/BRAND.md / apps/web/src/app/globals.css.
const BG = "#091422";
const TEAM_COLOURS = {
  red: { fill: "#991b1b", ink: "#fef2f2" },
  blue: { fill: "#93c5fd", ink: "#091422" },
};

const members = scenario.groups.flatMap((g) => g.members.map((m) => ({ ...m, team: g.team })));
const fullName = (m) => `${m.firstName} ${m.lastName}`;
const emailFor = (key) => `cage.${key}@demo.tikiacca.com`;
/** Same as formatLegPoints in packages/shared/src/scoring.ts. */
const formatPoints = (n) => `${Number(n.toFixed(2)).toString()} pts`;
const to2 = (n) => Number(n.toFixed(2));

function seed(stageName) {
  const out = execFileSync("npx", ["tsx", "prisma/video-ad-seed.ts", `--stage=${stageName}`], {
    cwd: join(REPO_ROOT, "packages", "database"),
    encoding: "utf8",
  });
  process.stdout.write(out.replace(/^/gm, "  "));
}

async function avatarDataUris() {
  const uris = {};
  for (const m of members) {
    const ext = ["png", "jpg", "jpeg", "webp"].find((e) => existsSync(join(AVATAR_DIR, `${m.key}.${e}`)));
    let input;
    if (ext) {
      input = join(AVATAR_DIR, `${m.key}.${ext}`);
    } else {
      const { fill, ink } = TEAM_COLOURS[m.team];
      const initials = `${m.firstName[0]}${m.lastName[0]}`;
      input = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
          <circle cx="128" cy="128" r="128" fill="${fill}"/>
          <text x="128" y="128" dy="0.35em" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
            font-size="104" font-weight="700" fill="${ink}">${initials}</text>
        </svg>`
      );
    }
    const png = await sharp(input).resize(256, 256, { fit: "cover" }).png().toBuffer();
    uris[fullName(m)] = `data:image/png;base64,${png.toString("base64")}`;
  }
  return uris;
}

/**
 * Runs in the page: hides the Next.js dev badge, restores pass order in any
 * list of cast members (the active betslip query has no leg orderBy), hides
 * the signed-in member's own Change/Remove controls, and adds
 * each member's profile picture beside their name.
 */
function decoratePage({ avatars, order }) {
  if (!document.getElementById("video-ad-capture-style")) {
    const style = document.createElement("style");
    style.id = "video-ad-capture-style";
    style.textContent = "nextjs-portal{display:none!important}";
    document.head.appendChild(style);
  }
  const main = document.querySelector("main") ?? document.body;
  // Whoever is signed in sees Change/Remove on their own pick until first
  // kickoff; the ad shows the betslip from a neutral viewpoint.
  for (const button of main.querySelectorAll("li button")) {
    if (!/^(Change|Remove)$/.test(button.textContent.trim())) continue;
    button.style.display = "none";
    const holder = button.parentElement;
    if ([...holder.children].every((el) => el.style.display === "none")) holder.style.display = "none";
  }
  const rank = (el) => order.findIndex((name) => el.textContent.includes(name));
  for (const list of main.querySelectorAll("ul:not([data-video-ranked] ul)")) {
    const items = [...list.children];
    if (items.length > 1 && items.every((li) => rank(li) >= 0)) {
      items.sort((a, b) => rank(a) - rank(b)).forEach((li) => list.appendChild(li));
    }
  }
  if (!avatars) return;
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  const targets = [];
  while (walker.nextNode()) {
    const name = walker.currentNode.nodeValue.trim();
    if (avatars[name]) targets.push([walker.currentNode, name]);
  }
  for (const [node, name] of targets) {
    const parent = node.parentElement;
    if (parent.querySelector(":scope > img[data-video-avatar]")) continue;
    const img = document.createElement("img");
    img.src = avatars[name];
    img.alt = "";
    img.dataset.videoAvatar = "";
    Object.assign(img.style, {
      width: "28px",
      height: "28px",
      borderRadius: "9999px",
      objectFit: "cover",
      flexShrink: "0",
      boxShadow: "0 0 0 1px rgba(143, 163, 187, 0.35)",
    });
    parent.insertBefore(img, node);
    Object.assign(parent.style, { display: "inline-flex", alignItems: "center", gap: "10px" });
  }
}

/** Sticky header and fixed tab bar would otherwise overlap element crops. */
async function setFixedChromeHidden(page, hidden) {
  await page.evaluate((hide) => {
    for (const el of document.querySelectorAll("body *")) {
      if (hide && ["fixed", "sticky"].includes(getComputedStyle(el).position)) {
        el.dataset.videoHidden = "";
        el.style.visibility = "hidden";
      } else if (!hide && el.dataset.videoHidden !== undefined) {
        el.style.visibility = "";
        delete el.dataset.videoHidden;
      }
    }
  }, hidden);
}

async function crop(page, locator, file) {
  await setFixedChromeHidden(page, true);
  const png = await locator.screenshot({ animations: "disabled", caret: "hide" });
  await setFixedChromeHidden(page, false);
  const pad = 24 * PHONE.deviceScaleFactor;
  await sharp(png)
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: BG })
    .png()
    .toFile(file);
}

/** Height of sticky/fixed chrome pinned to the top of the viewport. */
const stickyTop = (page) =>
  page.evaluate(() =>
    Math.max(
      0,
      ...[...document.querySelectorAll("body *")]
        .filter((el) => ["fixed", "sticky"].includes(getComputedStyle(el).position))
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.top <= 1 && r.height < 200)
        .map((r) => r.bottom)
    )
  );

/**
 * Screenshot one phone screen. By default page position `y` sits just below
 * the sticky header; with `bottom: true` it sits just above the bottom tab bar.
 */
async function screen(page, y, file, { bottom = false } = {}) {
  const top = bottom
    ? y - (PHONE.viewport.height - BOTTOM_TAB_BAR)
    : y - (await stickyTop(page));
  await page.evaluate((scrollY) => window.scrollTo(0, Math.max(0, scrollY)), top);
  await page.waitForTimeout(150);
  await page.screenshot({ path: file, animations: "disabled", caret: "hide" });
}

const topOf = (locator) => locator.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
const bottomOf = (locator) => locator.evaluate((el) => el.getBoundingClientRect().bottom + window.scrollY);

const sessions = new Map();

/**
 * New phone context signed in as `memberKey`. Sign-in is rate limited (10 per
 * 5 minutes per IP), so each member signs in once and later stages reuse the
 * session; the seed keeps user IDs stable across stages.
 */
async function phoneAs(browser, memberKey) {
  if (sessions.has(memberKey)) {
    const context = await browser.newContext({ ...PHONE, storageState: sessions.get(memberKey) });
    return { context, page: await context.newPage() };
  }
  const context = await browser.newContext(PHONE);
  const page = await signIn(context, memberKey);
  sessions.set(memberKey, await context.storageState());
  return { context, page };
}

async function signIn(context, memberKey) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/sign-in`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.locator("#signin-email").fill(emailFor(memberKey));
  await page.locator("#signin-password").fill(scenario.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/dashboard(?:\?.*)?$/, { timeout: 60_000 });
  return page;
}

async function groupId(page, groupKey) {
  const name = scenario.groups.find((g) => g.key === groupKey).name;
  const res = await page.request.get(`${BASE_URL}/api/groups`);
  if (!res.ok()) throw new Error(`Could not load groups (${res.status()}).`);
  const group = (await res.json()).groups?.find((g) => g.name === name);
  if (!group) throw new Error(`Could not find ${name}. Did the seed run against this database?`);
  return group.id;
}

async function captureBetslip(page, stage, dir, decorate) {
  const id = await groupId(page, stage.group);
  await page.goto(`${BASE_URL}/groups/${id}`, { waitUntil: "networkidle", timeout: 120_000 });
  const picks = page.locator("section").filter({ has: page.getByRole("heading", { name: "Picks", exact: true }) });
  await picks.waitFor();
  await page.evaluate(decoratePage, decorate);

  const status = stage.status === "open"
    ? page.locator("div.space-y-3").filter({ hasText: /Waiting on|Everyone has submitted/ }).first()
    : page.locator("div.rounded-lg").filter({ hasText: /^(Acca locked|Acca in progress|All legs settled)/ }).first();
  const odds = page.getByText(/^(Current|Locked)? ?combined odds$/i).first().locator("..");
  const tabs = page.getByRole("link", { name: "Bet", exact: true }).locator("..");

  await crop(page, status, join(dir, "progress.png"));
  await crop(page, picks, join(dir, "picks.png"));
  await crop(page, odds, join(dir, "odds.png"));
  await screen(page, (await topOf(tabs)) - 12, join(dir, "screen.png"));
  await screen(page, (await bottomOf(odds)) + 24, join(dir, "screen-odds.png"), { bottom: true });
  return ["progress.png", "picks.png", "odds.png", "screen.png", "screen-odds.png"];
}

async function captureHistory(page, stage, dir, decorate) {
  const id = await groupId(page, stage.group);
  const first = scenario.groups.find((g) => g.key === stage.group).members[0];
  await page.goto(`${BASE_URL}/groups/${id}/history`, { waitUntil: "networkidle", timeout: 120_000 });
  const card = page.locator("article").filter({ hasText: fullName(first) }).first();
  await card.waitFor();
  await page.evaluate(decoratePage, decorate);
  await crop(page, card, join(dir, "card.png"));
  await screen(page, (await topOf(card)) - 16, join(dir, "screen.png"));
  return ["card.png", "screen.png"];
}

function leaderboardData() {
  const teams = scenario.groups.map((g) => {
    const combined = to2(g.members.reduce((acc, m) => acc * m.pick.odds, 1));
    const won = g.members.filter((m) => m.pick.outcome === "won").length;
    // groupAccaRoundPoints: any lost leg scores −1, a landed acca scores combined − 1.
    const points = won === g.members.length ? to2(combined - 1) : -1;
    const players = g.members
      .map((m) => ({
        name: fullName(m),
        outcome: m.pick.outcome,
        // memberAccaLegPoints: each pick scores on its own result.
        points: m.pick.outcome === "won" ? to2(m.pick.odds - 1) : -1,
      }))
      .sort((a, b) => b.points - a.points);
    return { name: g.name, team: g.team, combined, won, legs: g.members.length, points, players };
  });
  return teams.sort((a, b) => b.points - a.points);
}

/** Composite leaderboard markup, built only from classes the app already ships. */
function leaderboardHtml(teams) {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const dot = (team) =>
    `<span style="display:inline-block;width:10px;height:10px;border-radius:9999px;background:${TEAM_COLOURS[team].fill};flex-shrink:0"></span>`;
  const tone = (n) => (n > 0 ? "text-success" : n < 0 ? "text-danger" : "text-muted");
  const outcomeRow = (o) =>
    o === "won"
      ? "border-success-strong/40 bg-success-strong/10 text-success"
      : "border-danger-strong/40 bg-danger-strong/10 text-danger";
  const teamRows = teams
    .map(
      (t, i) => `
      <li class="rounded-lg border border-border text-sm" style="background:${BG};padding:8px 12px">
        <div class="flex items-center justify-between gap-2">
          <span class="flex items-center gap-2">
            <span class="text-muted tabular-nums" style="width:14px">${i + 1}</span>${dot(t.team)}
            <span class="font-medium text-foreground">${esc(t.name)}</span>
          </span>
          <span class="text-lg font-semibold tabular-nums ${tone(t.points)}" data-points="${t.points}">${formatPoints(t.points)}</span>
        </div>
        <p class="text-xs text-muted" style="padding-left:40px;margin-top:2px">Acca @ ${t.combined.toFixed(2)} · ${t.won} of ${t.legs} legs won</p>
      </li>`
    )
    .join("");
  const playerBlocks = teams
    .map(
      (t) => `
      <p class="mt-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted">${dot(t.team)}${esc(t.name)}</p>
      <ul class="mt-2" style="display:grid;gap:6px">${t.players
        .map(
          (p) => `
        <li class="rounded-lg border text-sm ${outcomeRow(p.outcome)}" style="padding:5px 12px">
          <div class="flex items-center justify-between gap-2">
            <span class="font-medium text-foreground">${esc(p.name)}</span>
            <div class="flex items-center gap-2">
              <span class="rounded-full border border-current/20 px-2 py-0.5 text-xs font-medium">${p.outcome === "won" ? "Won" : "Lost"}</span>
              <span class="font-medium tabular-nums" style="min-width:64px;text-align:right" data-points="${p.points}">${formatPoints(p.points)}</span>
            </div>
          </div>
        </li>`
        )
        .join("")}
      </ul>`
    )
    .join("");
  return `
    <div data-video-leaderboard data-video-ranked style="display:grid;gap:14px;padding-top:4px">
      <section class="rounded-xl border border-border bg-card p-4">
        <p class="text-xs font-medium uppercase tracking-wide text-muted">Leaderboard · Team points</p>
        <ul class="mt-3" style="display:grid;gap:8px">${teamRows}</ul>
      </section>
      <section class="rounded-xl border border-border bg-card p-4">
        <p class="text-xs font-medium uppercase tracking-wide text-muted">Player points</p>
        ${playerBlocks}
      </section>
    </div>`;
}

async function captureLeaderboard(page, dir, decorate) {
  const id = await groupId(page, scenario.groups[0].key);
  await page.goto(`${BASE_URL}/groups/${id}/history`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.locator("article").first().waitFor();
  await page.evaluate((html) => {
    document.querySelector("main").innerHTML = html;
    window.scrollTo(0, 0);
  }, leaderboardHtml(leaderboardData()));
  await page.evaluate(decoratePage, decorate);
  const board = page.locator("[data-video-leaderboard]");
  await crop(page, board, join(dir, "board.png"));
  await screen(page, (await topOf(board)) - 12, join(dir, "screen.png"));
  const files = ["board.png", "screen.png"];

  if (leaderboardFrames) {
    // 1s count-up at 30fps, eased; the final frame matches board.png.
    const framesDir = join(dir, "frames");
    mkdirSync(framesDir, { recursive: true });
    const total = 30;
    for (let f = 0; f <= total; f++) {
      const t = 1 - Math.pow(1 - f / total, 3);
      await page.evaluate((progress) => {
        for (const el of document.querySelectorAll("[data-points]")) {
          const v = Number(el.dataset.points) * progress;
          el.textContent = `${Number(v.toFixed(2)).toString()} pts`;
        }
      }, t);
      const name = `frame-${String(f).padStart(4, "0")}.png`;
      await screen(page, (await topOf(board)) - 12, join(framesDir, name));
    }
    files.push(`frames/ (${total + 1} frames)`);
  }
  return files;
}

const stages = onlyStage
  ? scenario.stages.filter((s) => s.name === onlyStage || onlyStage === "leaderboard")
  : scenario.stages;
if (onlyStage && onlyStage !== "leaderboard" && stages.length === 0) {
  throw new Error(`Unknown stage "${onlyStage}". Valid: ${scenario.stages.map((s) => s.name).join(", ")}, leaderboard`);
}
const order = members.map(fullName);
const decorate = { avatars: useAvatars ? await avatarDataUris() : null, order };
const manifest = [];
mkdirSync(OUT, { recursive: true });

const executablePath = process.env.MARKETING_CHROMIUM_PATH;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
try {
  for (const stage of onlyStage === "leaderboard" ? [] : stages) {
    console.log(`\n${stage.beat} ${stage.name}`);
    seed(stage.name);
    const dir = join(OUT, `${stage.beat}-${stage.name}`);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const { context, page } = await phoneAs(browser, stage.loginAs);
    const files =
      stage.view === "history"
        ? await captureHistory(page, stage, dir, decorate)
        : await captureBetslip(page, stage, dir, decorate);
    await context.close();
    manifest.push({ beat: stage.beat, stage: stage.name, dir: relative(VIDEO_ROOT, dir), files });
    console.log(`  saved ${files.join(", ")}`);
  }

  if (!onlyStage || onlyStage === "leaderboard") {
    console.log("\nL1 leaderboard");
    seed("final");
    const dir = join(OUT, "L1-leaderboard");
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const { context, page } = await phoneAs(browser, scenario.groups[0].members[0].key);
    const files = await captureLeaderboard(page, dir, decorate);
    await context.close();
    manifest.push({ beat: "L1", stage: "leaderboard", dir: relative(VIDEO_ROOT, dir), files });
    console.log(`  saved ${files.join(", ")}`);
  }
} finally {
  await browser.close();
}

if (!onlyStage) {
  writeFileSync(
    join(OUT, "manifest.json"),
    `${JSON.stringify({ capturedAt: new Date().toISOString(), avatars: useAvatars, beats: manifest }, null, 2)}\n`
  );
}
console.log(`\nDone → ${relative(REPO_ROOT, OUT)}`);
