#!/usr/bin/env node
/**
 * Regenerates the raster brand assets from the current palette:
 *   - apps/web/src/app/favicon.ico          (48² PNG-in-ICO disc)
 *   - apps/mobile/assets/favicon.png        (48² disc)
 *   - apps/mobile/assets/icon.png           (1024² glyph on accent-muted square)
 *   - apps/mobile/assets/splash-icon.png    (1024² disc, centred, transparent)
 *   - apps/mobile/assets/android-icon-{background,foreground,monochrome}.png
 *
 * Colours come from BRAND_COLORS (packages/shared/src/brand.ts) — run this after
 * any palette change, then bump the `?v=` favicon cache-bust in layout.tsx.
 * Disc cuts render apps/web/src/app/icon.svg (keep that file in the palette too;
 * check-brand-sync.mjs guards brand.ts ↔ globals.css but not the SVG).
 *
 * Glyph geometry mirrors logo.tsx including its vertical reflect — the rondo is
 * apex-DOWN; if you touch the geometry, compare against docs/brand history.
 *
 * Usage: node scripts/generate-brand-assets.mjs
 */
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const brandSource = readFileSync(join(root, "packages/shared/src/brand.ts"), "utf8");
const colorsBlock = brandSource.match(/BRAND_COLORS\s*=\s*\{([\s\S]*?)\}\s*as const/);
if (!colorsBlock) throw new Error("Could not find BRAND_COLORS in brand.ts");
const BRAND = {};
for (const [, key, value] of colorsBlock[1].matchAll(/^\s*(\w+):\s*"(#[0-9a-fA-F]{3,8})",?\s*$/gm)) {
  BRAND[key] = value;
}

const FG = BRAND.foreground;
const ACCENT = BRAND.accent;
const ACCENT_MUTED = BRAND.accentMuted;

// Upright coordinates from logo.tsx, reflected apex-down like the DOM/RN cuts.
// Flipped content bbox: x 43.77..176.23, y 65..184 in the 220 viewBox.
function glyphSvg({ mono = false } = {}) {
  const dot = mono ? FG : ACCENT;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="43.77 65 132.46 119" fill="none">
  <g transform="translate(0,220) scale(1,-1)">
  <line x1="121.5" y1="71.92" x2="142.73" y2="108.69" stroke="${FG}" stroke-width="11" stroke-linecap="round"/>
  <path d="M136.28 112.47 L149.23 119.95 L149.23 105" fill="none" stroke="${FG}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="137.23" y1="139" x2="94.77" y2="139" stroke="${FG}" stroke-width="11" stroke-linecap="round"/>
  <path d="M94.72 131.53 L81.77 139 L94.72 146.47" fill="none" stroke="${FG}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="71.27" y1="119.08" x2="92.5" y2="82.31" stroke="${FG}" stroke-width="11" stroke-linecap="round"/>
  <path d="M99 86 L99 71.05 L86.05 78.53" fill="none" stroke="${FG}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="110" cy="52" r="16" fill="${FG}"/>
  <circle cx="160.23" cy="139" r="16" fill="${FG}"/>
  <circle cx="59.77" cy="139" r="16" fill="${FG}"/>
  <circle cx="110" cy="110" r="15" fill="${dot}"/>
  </g>
</svg>`;
}

const DISC_SVG = join(root, "apps/web/src/app/icon.svg");

const glyphPng = (w, h, opts) =>
  sharp(Buffer.from(glyphSvg(opts))).resize(w, h, { fit: "fill" }).png().toBuffer();

async function canvasWith(size, bg, overlay, left, top) {
  return sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: overlay, left, top }])
    .png();
}

const A = join(root, "apps/mobile/assets");
const T = "transparent";

// Compositions match the original hand-exported assets (bboxes measured from them).
await (await canvasWith(1024, ACCENT_MUTED, await glyphPng(618, 555), 203, 302)).toFile(`${A}/icon.png`);

await sharp({ create: { width: 512, height: 512, channels: 4, background: ACCENT_MUTED } })
  .png().toFile(`${A}/android-icon-background.png`);

await (await canvasWith(512, T, await glyphPng(218, 196), 147, 182)).toFile(`${A}/android-icon-foreground.png`);

await (await canvasWith(432, T, await glyphPng(182, 163, { mono: true }), 125, 154)).toFile(`${A}/android-icon-monochrome.png`);

const disc494 = await sharp(DISC_SVG).resize(494, 494).png().toBuffer();
await (await canvasWith(1024, T, disc494, 265, 265)).toFile(`${A}/splash-icon.png`);

await sharp(DISC_SVG).resize(48, 48).png().toFile(`${A}/favicon.png`);

// favicon.ico — single 48² PNG entry (PNG-in-ICO).
const png48 = await sharp(DISC_SVG).resize(48, 48).png().toBuffer();
const header = Buffer.alloc(6 + 16);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // count
header.writeUInt8(48, 6); // width
header.writeUInt8(48, 7); // height
header.writeUInt8(0, 8); // palette
header.writeUInt8(0, 9); // reserved
header.writeUInt16LE(1, 10); // colour planes
header.writeUInt16LE(32, 12); // bpp
header.writeUInt32LE(png48.length, 14); // data size
header.writeUInt32LE(22, 18); // data offset
writeFileSync(join(root, "apps/web/src/app/favicon.ico"), Buffer.concat([header, png48]));

console.log(`✓ regenerated 6 mobile assets + favicon.ico (accent ${ACCENT}, disc ${ACCENT_MUTED})`);
