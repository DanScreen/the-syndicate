/**
 * Tiki Acca — App Store screenshot framer.
 *
 * Wraps full-screen iOS captures in a photoreal iPhone frame (bezel + Dynamic
 * Island) on the Floodlight background, with a headline on top and the
 * compliance line at the bottom. Exports 1290×2796 PNGs — the exact size the
 * App Store requires for 6.7"/6.9" iPhones.
 *
 * SOURCE: drop full-screen Simulator captures (iPhone 16 Pro Max = 1290×2796)
 *         into marketing-posts/_appstore-raw/ named per SCREENS below.
 * OUTPUT: marketing-posts/app-store/*.png
 *
 * Run from the repo root:  node marketing-posts/scripts/frame-appstore.mjs
 * Add --placeholder to render synthetic sources for a geometry preview.
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const POSTS_ROOT = join(SCRIPT_DIR, "..");
const REPO_ROOT = join(POSTS_ROOT, "..");
const require = createRequire(join(REPO_ROOT, "package.json"));
const sharp = require("sharp");

const RAW = join(POSTS_ROOT, "_appstore-raw");
const OUT = join(POSTS_ROOT, "app-store");

// App Store 6.7"/6.9" portrait canvas — also the native device screen size.
const CANVAS_W = 1290, CANVAS_H = 2796;
const SCREEN_RATIO = CANVAS_W / CANVAS_H; // 0.4614

// Floodlight palette — keep in sync with docs/BRAND.md.
const C = {
  bgTop: "#0b1a30", bgBot: "#060f1c",
  accent: "#38bdf8", fg: "#f1f5f9", muted: "#8fa3bb",
  frame: "#20242b", frameHi: "#3a4048", island: "#05070b",
};
const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";
const DISPLAY_FONT = "Outfit, Helvetica Neue, Helvetica, Arial, sans-serif";
const FOOTER = "Not a bookmaker  ·  18+  ·  GambleAware";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// The five App Store screens, in listing order. `source` is the file in
// _appstore-raw/ (without extension); headline/sub sit above the phone.
const SCREENS = [
  { source: "01-dashboard", file: "01-dashboard", h: "Your mates. One acca.", s: "Everyone picks one leg. The group lives or dies together." },
  { source: "02-leg-picker", file: "02-leg-picker", h: "Pick your leg", s: "Choose a fixture and market — best odds found for you." },
  { source: "03-locked-acca", file: "03-locked-acca", h: "Best odds, done for you", s: "Live UK bookmaker prices ranked when your group locks." },
  { source: "04-leaderboard", file: "04-leaderboard", h: "Track who's actually good", s: "Points, form and bragging rights across every round." },
  { source: "05-performance", file: "05-performance", h: "See your form", s: "Cross-group stats and trends for every picker." },
];

// crude word-wrap by estimated glyph width (no font metrics in librsvg)
function wrap(text, fontSize, maxW, weight = 700) {
  const cw = fontSize * (weight >= 700 ? 0.545 : 0.52);
  const lines = [];
  let cur = "";
  for (const w of text.split(" ")) {
    const test = cur ? cur + " " + w : w;
    if (test.length * cw > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

function textBlock({ cx, y, headline, sub, hSize, sSize, maxW }) {
  const hLines = wrap(headline, hSize, maxW, 700);
  const sLines = wrap(sub, sSize, maxW, 400);
  const parts = [];
  let cy = y;
  const hLead = hSize * 1.1;
  for (const l of hLines) {
    parts.push(`<text x="${cx}" y="${cy}" text-anchor="middle" font-family="${DISPLAY_FONT}" font-size="${hSize}" font-weight="700" fill="${C.fg}" letter-spacing="-0.5">${esc(l)}</text>`);
    cy += hLead;
  }
  let sy = cy - hLead + Math.round(hSize * 0.5) + sSize;
  const sLead = sSize * 1.32;
  for (const l of sLines) {
    parts.push(`<text x="${cx}" y="${sy}" text-anchor="middle" font-family="${FONT}" font-size="${sSize}" font-weight="400" fill="${C.muted}">${esc(l)}</text>`);
    sy += sLead;
  }
  return parts.join("\n");
}

// Triangle rondo wordmark — mirrors make-posts.mjs.
const GLYPH = `
  <g>
    <line x1="127.05" y1="53.54" x2="158.53" y2="108.06" stroke="${C.fg}" stroke-width="11" stroke-linecap="round"/>
    <path d="M155.22 117.27 L168.17 124.75 L168.17 109.80" fill="none" stroke="${C.fg}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="150.38" y1="153" x2="87.42" y2="153" stroke="${C.fg}" stroke-width="11" stroke-linecap="round"/>
    <path d="M81.09 145.53 L68.14 153 L81.09 160.47" fill="none" stroke="${C.fg}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="52.57" y1="123.46" x2="84.05" y2="68.94" stroke="${C.fg}" stroke-width="11" stroke-linecap="round"/>
    <path d="M93.69 67.20 L93.69 52.25 L80.74 59.73" fill="none" stroke="${C.fg}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="110" cy="24" r="16" fill="${C.fg}"/>
    <circle cx="184.48" cy="153" r="16" fill="${C.fg}"/>
    <circle cx="35.52" cy="153" r="16" fill="${C.fg}"/>
  </g>
  <circle cx="110" cy="110" r="15" fill="${C.accent}"/>`;

function wordmark(cx, baselineY, size = 46) {
  const markSize = Math.round(size * 1.4);
  const s = markSize / 220;
  const minX = 19.5, maxX = 200.5, centreY = 88.5;
  // Total width to centre the lockup: glyph span + gap + "Tiki Acca".
  const glyphW = (maxX - minX) * s;
  const gap = size * 0.42;
  const textW = size * 5.0; // rough width of "Tiki Acca" at this size
  const xLeft = cx - (glyphW + gap + textW) / 2;
  const gx = xLeft - minX * s;
  const gy = baselineY - size * 0.34 - centreY * s;
  const textX = xLeft + glyphW + gap;
  return `
    <g transform="translate(${gx.toFixed(2)} ${gy.toFixed(2)}) scale(${s.toFixed(4)})">${GLYPH}</g>
    <text x="${textX.toFixed(1)}" y="${baselineY}" font-family="${FONT}" font-size="${size}" font-weight="700" fill="${C.fg}">Tiki <tspan fill="${C.accent}">Acca</tspan></text>`;
}

// Photoreal-ish iPhone frame around a screen rect (sx,sy,sw,sh).
function iphoneFrame(sx, sy, sw, sh) {
  const screenRad = Math.round(sw * 0.093);
  const band = Math.round(sw * 0.022);        // titanium band thickness
  const dx = sx - band, dy = sy - band;
  const dw = sw + band * 2, dh = sh + band * 2;
  const deviceRad = screenRad + band;
  // Dynamic Island
  const diW = Math.round(sw * 0.30), diH = Math.round(sw * 0.088);
  const diX = sx + (sw - diW) / 2, diY = sy + Math.round(sw * 0.030);
  // Side buttons
  const btn = Math.round(band * 0.5);
  const btnFill = "#0c0e12";
  return `
    <ellipse cx="${sx + sw / 2}" cy="${sy + sh / 2}" rx="${sw * 0.8}" ry="${sh * 0.55}" fill="url(#glow)" opacity="0.22"/>
    <rect x="${dx + 14}" y="${dy + 30}" width="${dw}" height="${dh}" rx="${deviceRad}" fill="#000000" opacity="0.5"/>
    <rect x="${dx - btn}" y="${dy + dh * 0.26}" width="${btn + 2}" height="${dh * 0.05}" rx="3" fill="${btnFill}"/>
    <rect x="${dx - btn}" y="${dy + dh * 0.34}" width="${btn + 2}" height="${dh * 0.09}" rx="3" fill="${btnFill}"/>
    <rect x="${dx - btn}" y="${dy + dh * 0.46}" width="${btn + 2}" height="${dh * 0.09}" rx="3" fill="${btnFill}"/>
    <rect x="${dx + dw - 2}" y="${dy + dh * 0.30}" width="${btn + 2}" height="${dh * 0.12}" rx="3" fill="${btnFill}"/>
    <rect x="${dx}" y="${dy}" width="${dw}" height="${dh}" rx="${deviceRad}" fill="${C.frame}"/>
    <rect x="${dx + 1.5}" y="${dy + 1.5}" width="${dw - 3}" height="${dh - 3}" rx="${deviceRad - 2}" fill="none" stroke="${C.frameHi}" stroke-width="3" stroke-opacity="0.6"/>
    <rect x="${sx - 1}" y="${sy - 1}" width="${sw + 2}" height="${sh + 2}" rx="${screenRad}" fill="#000000"/>
    <!-- screenshot is composited here by sharp -->
    <rect x="${diX}" y="${diY}" width="${diW}" height="${diH}" rx="${diH / 2}" fill="${C.island}"/>`;
}

async function roundedScreen(input, sw, sh, screenRad) {
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${sw}" height="${sh}"><rect width="${sw}" height="${sh}" rx="${screenRad}" ry="${screenRad}" fill="#fff"/></svg>`);
  return sharp(input)
    .resize(sw, sh, { fit: "cover", position: "top" })
    .composite([{ input: mask, blend: "dest-in" }])
    .png().toBuffer();
}

async function placeholderSource(label) {
  // A synthetic full-screen capture so we can preview frame geometry.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${CANVAS_H}">
    <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="#0b1220"/>
    <rect x="0" y="0" width="${CANVAS_W}" height="180" fill="#0f1b2d"/>
    <text x="${CANVAS_W / 2}" y="900" text-anchor="middle" font-family="${FONT}" font-size="90" fill="${C.accent}">${esc(label)}</text>
    <text x="${CANVAS_W / 2}" y="1020" text-anchor="middle" font-family="${FONT}" font-size="52" fill="${C.muted}">full-screen capture goes here</text>
    <rect x="120" y="1300" width="1050" height="240" rx="24" fill="#0f1b2d"/>
    <rect x="120" y="1600" width="1050" height="240" rx="24" fill="#0f1b2d"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function build() {
  const placeholder = process.argv.includes("--placeholder");
  mkdirSync(OUT, { recursive: true });

  // Phone geometry on the canvas: headline on top, framed phone below.
  const sh = 1980;
  const sw = Math.round(sh * SCREEN_RATIO);
  const sx = Math.round((CANVAS_W - sw) / 2);
  const sy = 660;
  const screenRad = Math.round(sw * 0.093);

  let made = 0;
  for (const screen of SCREENS) {
    const rawPath = join(RAW, screen.source + ".png");
    let source;
    if (placeholder) {
      source = await placeholderSource(screen.source);
    } else if (existsSync(rawPath)) {
      source = rawPath;
    } else {
      console.warn(`skip ${screen.file}: missing ${rawPath}`);
      continue;
    }

    const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${CANVAS_H}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.bgTop}"/><stop offset="1" stop-color="${C.bgBot}"/></linearGradient>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${C.accent}" stop-opacity="0.9"/><stop offset="1" stop-color="${C.accent}" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="${CANVAS_W}" height="${CANVAS_H}" fill="url(#bg)"/>
      ${wordmark(CANVAS_W / 2, 150, 46)}
      ${textBlock({ cx: CANVAS_W / 2, y: 320, headline: screen.h, sub: screen.s, hSize: 92, sSize: 44, maxW: 1120 })}
      ${iphoneFrame(sx, sy, sw, sh)}
      <text x="${CANVAS_W / 2}" y="${CANVAS_H - 70}" text-anchor="middle" font-family="${FONT}" font-size="30" font-weight="400" fill="${C.muted}" letter-spacing="0.5">${esc(FOOTER)}</text>
    </svg>`;

    const bg = await sharp(Buffer.from(bgSvg)).png().toBuffer();
    const screenImg = await roundedScreen(source, sw, sh, screenRad);
    // Composite the screenshot, then re-overlay the SVG island by drawing it last.
    // Simplest: composite screenshot under the island — island is in bgSvg drawn
    // AFTER the frame but the screenshot lands on top, so redraw island on top.
    const islandW = Math.round(sw * 0.30), islandH = Math.round(sw * 0.088);
    const islandX = sx + Math.round((sw - islandW) / 2), islandY = sy + Math.round(sw * 0.030);
    const island = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${islandW}" height="${islandH}"><rect width="${islandW}" height="${islandH}" rx="${islandH / 2}" fill="${C.island}"/></svg>`)).png().toBuffer();

    await sharp(bg)
      .composite([
        { input: screenImg, left: sx, top: sy },
        { input: island, left: islandX, top: islandY },
      ])
      .png().toFile(join(OUT, screen.file + ".png"));
    console.log("app-store →", screen.file + ".png");
    made++;
  }
  console.log(`DONE — ${made} image(s)` + (placeholder ? " (placeholder preview)" : ""));
}
build().catch((e) => { console.error(e); process.exit(1); });
