#!/usr/bin/env node
/**
 * Regenerates the raster brand assets from the current palette:
 *   - apps/web/src/app/favicon.ico          (48² PNG-in-ICO disc)
 *   - apps/web/public/brand/email-logo.png  (128² disc)
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
 * Glyph geometry mirrors logo.tsx — wide apex-up rondo.
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

// Wide apex-up coordinates from logo.tsx. Tight content bbox includes dots.
function glyphSvg({ mono = false } = {}) {
  const dot = mono ? FG : ACCENT;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="31.65 22 156.7 140" fill="none">
  <g>
  <line x1="124.28" y1="62.73" x2="150.63" y2="108.37" stroke="${FG}" stroke-width="11" stroke-linecap="round"/>
  <path d="M145.75 114.87 L158.70 122.35 L158.70 107.40" fill="none" stroke="${FG}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="143.80" y1="146" x2="91.09" y2="146" stroke="${FG}" stroke-width="11" stroke-linecap="round"/>
  <path d="M87.91 138.53 L74.96 146 L87.91 153.47" fill="none" stroke="${FG}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="61.92" y1="121.27" x2="88.28" y2="75.63" stroke="${FG}" stroke-width="11" stroke-linecap="round"/>
  <path d="M96.34 76.60 L96.34 61.65 L83.39 69.13" fill="none" stroke="${FG}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="110" cy="38" r="16" fill="${FG}"/>
  <circle cx="172.35" cy="146" r="16" fill="${FG}"/>
  <circle cx="47.65" cy="146" r="16" fill="${FG}"/>
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
await sharp(DISC_SVG).resize(128, 128).png().toFile(
  join(root, "apps/web/public/brand/email-logo.png")
);

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

console.log(`✓ regenerated mobile, email, and favicon assets (accent ${ACCENT}, disc ${ACCENT_MUTED})`);
