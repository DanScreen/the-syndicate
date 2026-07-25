/**
 * Build the 1500×500 X profile header.
 *
 * Safe areas:
 * - Left ~300px: quiet — X overlays the avatar there on desktop.
 * - Top ~100px: keep clear of brand/copy — iPhone status + nav chrome
 *   cover this band on mobile.
 *
 * Run: npm run marketing:x-header
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const POSTS_ROOT = join(SCRIPT_DIR, "..");
const REPO_ROOT = join(POSTS_ROOT, "..");
const require = createRequire(join(REPO_ROOT, "package.json"));
const sharp = require("sharp");

const W = 1500;
const H = 500;
const OUT = join(POSTS_ROOT, "x-twitter", "header-1500x500.png");
const FONT = "Outfit, Helvetica Neue, Helvetica, Arial, sans-serif";

const glyph = `
  <line x1="124.98" y1="59.94" x2="152.79" y2="108.13" stroke="#f1f5f9" stroke-width="10" stroke-linecap="round"/>
  <path d="M149.61 116.41 L161.56 123.31 L161.56 109.51" fill="none" stroke="#f1f5f9" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="145.85" y1="148" x2="90.23" y2="148" stroke="#f1f5f9" stroke-width="10" stroke-linecap="round"/>
  <path d="M84.64 141.10 L72.69 148 L84.64 154.90" fill="none" stroke="#f1f5f9" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="59.17" y1="122.06" x2="86.98" y2="73.87" stroke="#f1f5f9" stroke-width="10" stroke-linecap="round"/>
  <path d="M95.75 72.49 L95.75 58.69 L83.80 65.59" fill="none" stroke="#f1f5f9" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="110" cy="34" r="14.5" fill="#f1f5f9"/>
  <circle cx="175.81" cy="148" r="14.5" fill="#f1f5f9"/>
  <circle cx="44.19" cy="148" r="14.5" fill="#f1f5f9"/>
  <circle cx="110" cy="110" r="13.5" fill="#38bdf8"/>`;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#091422"/>
      <stop offset="0.58" stop-color="#0b1a30"/>
      <stop offset="1" stop-color="#07111f"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#38bdf8" stop-opacity=".24"/>
      <stop offset="1" stop-color="#38bdf8" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <ellipse cx="1180" cy="160" rx="430" ry="300" fill="url(#glow)"/>

  <!-- Quiet avatar-overlap zone on the left; subtle pitch markings only. -->
  <path d="M0 420 C130 360 220 330 320 330" fill="none" stroke="#38bdf8" stroke-opacity=".08" stroke-width="2"/>
  <circle cx="82" cy="470" r="190" fill="none" stroke="#38bdf8" stroke-opacity=".05" stroke-width="2"/>

  <!-- Oversized watermark, deliberately cropped at the right edge. -->
  <g transform="translate(1120 70) scale(2.45)" opacity=".075">${glyph}</g>

  <!-- Wordmark — kept well below the mobile status/nav chrome. -->
  <g transform="translate(430 132) scale(.34)">${glyph}</g>
  <text x="510" y="191" font-family="${FONT}" font-size="40" font-weight="700" fill="#f1f5f9">
    Tiki <tspan fill="#38bdf8">Acca</tspan>
  </text>

  <text x="430" y="262" font-family="${FONT}" font-size="54" font-weight="700" letter-spacing="-1.2" fill="#f1f5f9">
    Your mates. One acca.
  </text>
  <text x="430" y="320" font-family="${FONT}" font-size="54" font-weight="700" letter-spacing="-1.2" fill="#7dd3fc">
    Every leg counts.
  </text>

  <text x="432" y="380" font-family="${FONT}" font-size="32" font-weight="600" letter-spacing="2.8" fill="#8fa3bb">
    SOCIAL GROUP BETTING
  </text>
  <text x="432" y="434" font-family="${FONT}" font-size="25" font-weight="600" fill="#f1f5f9">
    Start your group for free at <tspan fill="#38bdf8">tikiacca.com</tspan>
  </text>

  <text x="1435" y="470" text-anchor="end" font-family="${FONT}" font-size="16" font-weight="400" fill="#8fa3bb">
    Not a bookmaker · 18+ · GambleAware
  </text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(OUT);
console.log("wrote", OUT, `${W}×${H}`);
