/**
 * Tiki Acca — marketing post composer.
 *
 * Frames each raw mobile screenshot (marketing-posts/_raw-screenshots/*.jpg) as a
 * device card on the Floodlight-branded background, adds a headline + subhead, the
 * Triangle rondo wordmark, and the compliance line — then exports one PNG per
 * platform into marketing-posts/{square,story,x-twitter}/.
 *
 * EDIT THE MARKETING MESSAGE: update scripts/concepts.mjs. This composer and the
 * review gallery both read that shared manifest.
 *
 * Run:  node marketing-posts/scripts/make-posts.mjs
 * Deps: sharp (already in the repo root node_modules).
 */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { shots } from "./concepts.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));   // <repo>/marketing-posts/scripts
const POSTS_ROOT = join(SCRIPT_DIR, "..");                    // <repo>/marketing-posts
const REPO_ROOT = join(POSTS_ROOT, "..");                    // <repo>
const require = createRequire(join(REPO_ROOT, "package.json"));
const sharp = require("sharp");

const SHOTS = join(POSTS_ROOT, "_raw-screenshots");
const OUT = POSTS_ROOT;

// Floodlight palette — keep in sync with docs/BRAND.md / apps/web/src/app/globals.css.
const C = {
  bgTop: "#0b1a30", bgBot: "#060f1c", card: "#0f1b2d",
  accent: "#38bdf8", accentBright: "#7dd3fc", accentMuted: "#0c4a6e",
  fg: "#f1f5f9", muted: "#8fa3bb",
};
const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";
const DISPLAY_FONT = "Outfit, Helvetica Neue, Helvetica, Arial, sans-serif";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Native raw-screenshot aspect (w/h). Update if the capture viewport changes.
const SHOT_W = 1062, SHOT_H = 1148, R = SHOT_W / SHOT_H;

const FOOTER = "Not a bookmaker  ·  18+  ·  GambleAware";

// crude word-wrap by estimated glyph width (no font metrics available in librsvg)
function wrap(text, fontSize, maxW, weight = 700) {
  const cw = fontSize * (weight >= 700 ? 0.545 : 0.52);
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (test.length * cw > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

function textBlock({ x, y, align, headline, sub, hSize, sSize, maxW }) {
  const hLines = wrap(headline, hSize, maxW, 700);
  const sLines = wrap(sub, sSize, maxW, 400);
  const anchor = align === "center" ? "middle" : "start";
  const parts = [];
  let cy = y;
  const hLead = hSize * 1.12;
  for (const l of hLines) { parts.push(`<text x="${x}" y="${cy}" text-anchor="${anchor}" font-family="${DISPLAY_FONT}" font-size="${hSize}" font-weight="700" fill="${C.fg}" letter-spacing="-0.5">${esc(l)}</text>`); cy += hLead; }
  const lastBaseline = cy - hLead;
  let sy = lastBaseline + Math.round(hSize * 0.42) + sSize;
  const sLead = sSize * 1.34;
  for (const l of sLines) { parts.push(`<text x="${x}" y="${sy}" text-anchor="${anchor}" font-family="${FONT}" font-size="${sSize}" font-weight="400" fill="${C.muted}">${esc(l)}</text>`); sy += sLead; }
  return { svg: parts.join("\n"), bottom: sy };
}

// Triangle rondo glyph — mirrors LogoMark in apps/web/src/components/logo.tsx.
// 220×220 viewBox; content bounds x[19.5,200.5] y[8,169], centre-y ~88.5.
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

function wordmark(xLeft, baselineY, size = 34) {
  const markSize = Math.round(size * 1.4);
  const s = markSize / 220;
  const minX = 19.5, maxX = 200.5, centreY = 88.5;
  const gx = xLeft - minX * s;
  const yc = baselineY - size * 0.34;
  const gy = yc - centreY * s;
  const textX = xLeft + (maxX - minX) * s + size * 0.42;
  return `
    <g transform="translate(${gx.toFixed(2)} ${gy.toFixed(2)}) scale(${s.toFixed(4)})">${GLYPH}</g>
    <text x="${textX.toFixed(1)}" y="${baselineY}" font-family="${FONT}" font-size="${size}" font-weight="700" fill="${C.fg}">Tiki <tspan fill="${C.accent}">Acca</tspan></text>`;
}

function cardChrome(card, glowStrong = 0.28) {
  const rad = 40;
  const cx = card.x + card.w / 2, cy = card.y + card.h / 2;
  return `
    <ellipse cx="${cx}" cy="${cy}" rx="${card.w * 0.85}" ry="${card.h * 0.7}" fill="url(#glow)" opacity="${glowStrong}"/>
    <rect x="${card.x + 10}" y="${card.y + 22}" width="${card.w}" height="${card.h}" rx="${rad}" fill="#000000" opacity="0.45"/>
    <rect x="${card.x}" y="${card.y}" width="${card.w}" height="${card.h}" rx="${rad}" fill="${C.card}" stroke="${C.accent}" stroke-opacity="0.35" stroke-width="2"/>`;
}

const platforms = [
  {
    name: "square", w: 1080, h: 1080, grad: "v",
    layout(shot) {
      const card = shot.layout === "chart"
        ? { x: 70, y: 500, w: 940, h: 320 }
        : shot.layout === "panel"
          ? { x: 70, y: 450, w: 940, h: 440 }
          : { h: 556, w: Math.round(556 * R), x: Math.round((1080 - Math.round(556 * R)) / 2), y: 398 };
      const tb = textBlock({ x: 540, y: 166, align: "center", headline: shot.h, sub: shot.s, hSize: 56, sSize: 28, maxW: 940 });
      return { card, tb, wordmark: wordmark(70, 82, 32), footerX: 540, footerAnchor: "middle", footerY: 1032 };
    },
  },
  {
    name: "story", w: 1080, h: 1920, grad: "v",
    layout(shot) {
      const card = shot.layout === "chart"
        ? { x: 70, y: 860, w: 940, h: 340 }
        : shot.layout === "panel"
          ? { x: 70, y: 810, w: 940, h: 450 }
          : { w: 848, h: Math.round(848 / R), x: Math.round((1080 - 848) / 2), y: 792 };
      const tb = textBlock({ x: 540, y: 372, align: "center", headline: shot.h, sub: shot.s, hSize: 78, sSize: 38, maxW: 960 });
      return { card, tb, wordmark: wordmark(84, 150, 40), footerX: 540, footerAnchor: "middle", footerY: 1836 };
    },
  },
  {
    name: "x-twitter", w: 1600, h: 900, grad: "h",
    layout(shot) {
      const card = shot.layout === "chart"
        ? { x: 760, y: 300, w: 744, h: 280 }
        : shot.layout === "panel"
          ? { x: 760, y: 230, w: 744, h: 440 }
          : { h: 772, w: Math.round(772 * R), y: Math.round((900 - 772) / 2), x: 1600 - Math.round(772 * R) - 96 };
      const tb = textBlock({ x: 104, y: 300, align: "left", headline: shot.h, sub: shot.s, hSize: 62, sSize: 32, maxW: 660 });
      return { card, tb, wordmark: wordmark(104, 118, 36), footerX: 104, footerAnchor: "start", footerY: 838 };
    },
  },
];

async function roundedShot(file, w, h, fit = "cover") {
  const rad = Math.round(w * 0.055);
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${rad}" ry="${rad}" fill="#fff"/></svg>`);
  return sharp(join(SHOTS, file))
    .resize(w, h, {
      fit,
      position: "top",
      background: C.bgTop,
    })
    .composite([{ input: mask, blend: "dest-in" }])
    .png().toBuffer();
}

async function build() {
  for (const p of platforms) {
    const dir = join(OUT, p.name);
    mkdirSync(dir, { recursive: true });
    for (const shot of shots) {
      const L = p.layout(shot);
      const gradDef = p.grad === "v"
        ? `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.bgTop}"/><stop offset="1" stop-color="${C.bgBot}"/></linearGradient>`
        : `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.bgTop}"/><stop offset="1" stop-color="${C.bgBot}"/></linearGradient>`;
      const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${p.w}" height="${p.h}">
        <defs>
          ${gradDef}
          <radialGradient id="glow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stop-color="${C.accent}" stop-opacity="0.9"/>
            <stop offset="1" stop-color="${C.accent}" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="${p.w}" height="${p.h}" fill="url(#bg)"/>
        ${cardChrome(L.card)}
        ${L.wordmark}
        ${L.tb.svg}
        <text x="${L.footerX}" y="${L.footerY}" text-anchor="${L.footerAnchor}" font-family="${FONT}" font-size="22" font-weight="400" fill="${C.muted}" letter-spacing="0.5">${esc(FOOTER)}</text>
      </svg>`;
      const bezel = 14;
      const rs = await roundedShot(
        shot.source + ".jpg",
        L.card.w - bezel * 2,
        L.card.h - bezel * 2,
        shot.layout === "panel" || shot.layout === "chart" || shot.layout === "chat"
          ? "contain"
          : "cover"
      );
      const bg = await sharp(Buffer.from(bgSvg)).png().toBuffer();
      await sharp(bg)
        .composite([{ input: rs, left: L.card.x + bezel, top: L.card.y + bezel }])
        .png().toFile(join(dir, shot.file + ".png"));
      console.log(p.name, "→", shot.file + ".png");
    }
  }
  console.log("DONE — " + platforms.length * shots.length + " images");
}
build().catch((e) => { console.error(e); process.exit(1); });
