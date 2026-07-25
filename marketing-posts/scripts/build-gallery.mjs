/**
 * Tiki Acca — marketing post review gallery.
 *
 * Reads the composed PNGs from marketing-posts/{square,story,x-twitter}/, embeds
 * downscaled JPEG thumbnails as data URIs, and writes a single self-contained
 * marketing-posts/gallery.html (openable locally, or publish as a Claude Artifact).
 *
 * Run:  node marketing-posts/scripts/build-gallery.mjs
 */
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { shots } from "./concepts.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const POSTS = join(SCRIPT_DIR, "..");
const REPO_ROOT = join(POSTS, "..");
const require = createRequire(join(REPO_ROOT, "package.json"));
const sharp = require("sharp");

const OUT = join(POSTS, "gallery.html");

const platforms = [
  { dir: "square", label: "Square", dim: "1080×1080" },
  { dir: "story", label: "Story", dim: "1080×1920" },
  { dir: "x-twitter", label: "X / Twitter", dim: "1600×900" },
];

async function dataURI(path) {
  const buf = await sharp(path).resize({ height: 520, withoutEnlargement: true }).jpeg({ quality: 72 }).toBuffer();
  return "data:image/jpeg;base64," + buf.toString("base64");
}

const rows = [];
let total = 0;
for (const s of shots) {
  const cells = [];
  for (const p of platforms) {
    const uri = await dataURI(join(POSTS, p.dir, s.file + ".png"));
    total++;
    cells.push(`
      <figure class="cell ${p.dir}">
        <div class="frame"><img loading="lazy" src="${uri}" alt="${s.screen} — ${p.label}"></div>
        <figcaption><span class="plat">${p.label}</span><span class="dim">${p.dim}</span></figcaption>
      </figure>`);
  }
  rows.push(`
    <section class="shot">
      <div class="shot-head">
        <div class="shot-meta">
          <span class="tag ${s.kind}">${s.kind === "core" ? "Core" : "Alt"}</span>
          <span class="screen">${s.screen}</span>
        </div>
        <h2>${s.h}</h2>
      </div>
      <div class="variants">${cells.join("")}</div>
    </section>`);
}

const html = `<title>Tiki Acca — Social Launch Post Set</title>
<style>
  :root{
    --bg:#091422; --bg2:#0b1a30; --card:#0f1b2d; --border:#1e2c40;
    --accent:#38bdf8; --accent-bright:#7dd3fc; --accent-muted:#0c4a6e;
    --fg:#f1f5f9; --muted:#8fa3bb; --success:#4ade80;
    --font:-apple-system,BlinkMacSystemFont,"Segoe UI","Helvetica Neue",Arial,sans-serif;
  }
  *{box-sizing:border-box;}
  body{margin:0;background:radial-gradient(1200px 700px at 50% -200px,#12294a 0%,var(--bg) 60%);
    color:var(--fg);font-family:var(--font);-webkit-font-smoothing:antialiased;line-height:1.5;}
  .wrap{max-width:1160px;margin:0 auto;padding:64px 28px 96px;}
  header.top{border-bottom:1px solid var(--border);padding-bottom:32px;margin-bottom:8px;}
  .eyebrow{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);font-weight:700;}
  h1{font-size:clamp(30px,5vw,46px);line-height:1.05;letter-spacing:-.02em;margin:14px 0 12px;text-wrap:balance;}
  h1 em{font-style:normal;color:var(--accent);}
  .lede{color:var(--muted);max-width:60ch;font-size:16px;}
  .legend{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px;}
  .chip{display:inline-flex;align-items:baseline;gap:8px;background:var(--card);border:1px solid var(--border);
    border-radius:999px;padding:7px 14px;font-size:13px;}
  .chip b{color:var(--fg);font-weight:600;} .chip span{color:var(--muted);font-variant-numeric:tabular-nums;}
  .swatches{display:flex;gap:6px;margin-left:auto;align-items:center;}
  .sw{width:16px;height:16px;border-radius:4px;border:1px solid rgba(255,255,255,.08);}
  .shot{padding:40px 0;border-bottom:1px solid var(--border);}
  .shot-head{margin-bottom:22px;}
  .shot-meta{display:flex;align-items:center;gap:12px;margin-bottom:8px;}
  .tag{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:3px 9px;border-radius:6px;}
  .tag.core{background:var(--accent-muted);color:var(--accent-bright);}
  .tag.alt{background:#1c2740;color:var(--muted);border:1px solid var(--border);}
  .screen{font-size:13px;color:var(--muted);letter-spacing:.02em;}
  .shot h2{margin:0;font-size:clamp(20px,2.6vw,26px);letter-spacing:-.01em;font-weight:700;text-wrap:balance;}
  .variants{display:flex;flex-wrap:wrap;gap:22px;align-items:flex-start;}
  .cell{margin:0;display:flex;flex-direction:column;gap:9px;}
  .frame{border:1px solid var(--border);border-radius:14px;overflow:hidden;background:var(--bg);
    box-shadow:0 18px 40px -24px rgba(0,0,0,.8);line-height:0;}
  .frame img{display:block;height:260px;width:auto;}
  figcaption{display:flex;align-items:baseline;gap:8px;padding:0 2px;}
  .plat{font-size:13px;font-weight:600;color:var(--fg);}
  .dim{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums;}
  footer{margin-top:40px;color:var(--muted);font-size:13.5px;line-height:1.7;}
  footer code{background:var(--card);border:1px solid var(--border);border-radius:5px;padding:2px 7px;font-size:12.5px;color:var(--accent-bright);}
  @media (max-width:560px){ .frame img{height:200px;} .wrap{padding:44px 18px 72px;} }
</style>
<div class="wrap">
  <header class="top">
    <div class="eyebrow">Marketing assets · Floodlight</div>
    <h1>Social launch set — <em>product as hero</em></h1>
    <p class="lede">Real Tiki Acca UI, framed for each channel. ${total} images: ${shots.length} concepts × ${platforms.length} formats. Copy drawn from the brief's territories; every odds, points and name value comes from the demo group “The Thursday Club”.</p>
    <div class="legend">
      <span class="chip"><b>Square</b><span>1080×1080</span></span>
      <span class="chip"><b>Story / Reels</b><span>1080×1920</span></span>
      <span class="chip"><b>X / Twitter</b><span>1600×900</span></span>
      <span class="swatches" title="Floodlight palette">
        <span class="sw" style="background:#091422"></span>
        <span class="sw" style="background:#0f1b2d"></span>
        <span class="sw" style="background:#38bdf8"></span>
        <span class="sw" style="background:#7dd3fc"></span>
        <span class="sw" style="background:#4ade80"></span>
      </span>
    </div>
  </header>
  ${rows.join("")}
  <footer>
    Files live in <code>marketing-posts/</code> — one folder per platform (<code>square/</code>, <code>story/</code>, <code>x-twitter/</code>), full-resolution PNGs, plus <code>_raw-screenshots/</code> and <code>scripts/</code> that produced them.<br>
    Compliance line baked into every image: <b>Not a bookmaker · 18+ · GambleAware</b>.
  </footer>
</div>`;

writeFileSync(OUT, html);
console.log("wrote", OUT, "with", total, "thumbnails");
