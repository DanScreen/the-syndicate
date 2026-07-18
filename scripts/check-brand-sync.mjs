#!/usr/bin/env node
/**
 * Verifies the brand palette stays in sync between its two homes:
 *   - packages/shared/src/brand.ts   (BRAND_COLORS — feeds mobile + canvas/OG)
 *   - apps/web/src/app/globals.css   (:root CSS variables — feeds the web app)
 *
 * BRAND_COLORS is the source of truth. camelCase keys map to kebab-case CSS
 * variables (accentBright → --accent-bright). Run with --fix-hint to print the
 * expected :root block for globals.css.
 *
 * Usage: node scripts/check-brand-sync.mjs [--fix-hint]
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const brandPath = join(root, "packages/shared/src/brand.ts");
const cssPath = join(root, "apps/web/src/app/globals.css");

// Web-only variables that have no BRAND_COLORS counterpart.
const CSS_ONLY_VARS = new Set(["glow"]);
// BRAND_COLORS keys with a different CSS variable name.
const KEY_TO_VAR = { onAccent: "on-accent" };

function parseBrandColors(source) {
  const match = source.match(/BRAND_COLORS\s*=\s*\{([\s\S]*?)\}\s*as const/);
  if (!match) throw new Error(`Could not find BRAND_COLORS in ${brandPath}`);
  const colors = {};
  for (const [, key, value] of match[1].matchAll(/^\s*(\w+):\s*"(#[0-9a-fA-F]{3,8})",?\s*$/gm)) {
    colors[key] = value.toLowerCase();
  }
  if (Object.keys(colors).length === 0) throw new Error("Parsed zero colours from brand.ts");
  return colors;
}

function parseCssVars(source) {
  const match = source.match(/:root\s*\{([\s\S]*?)\}/);
  if (!match) throw new Error(`Could not find :root block in ${cssPath}`);
  const vars = {};
  for (const [, name, value] of match[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    vars[name] = value.toLowerCase();
  }
  return vars;
}

const kebab = (key) => KEY_TO_VAR[key] ?? key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const brand = parseBrandColors(readFileSync(brandPath, "utf8"));
const css = parseCssVars(readFileSync(cssPath, "utf8"));

const problems = [];
for (const [key, hex] of Object.entries(brand)) {
  const varName = kebab(key);
  if (!(varName in css)) {
    problems.push(`missing in globals.css: --${varName} (brand.ts ${key}: ${hex})`);
  } else if (css[varName] !== hex) {
    problems.push(`value drift: --${varName} is ${css[varName]} in globals.css but ${key} is ${hex} in brand.ts`);
  }
}
const expectedVars = new Set(Object.keys(brand).map(kebab));
for (const varName of Object.keys(css)) {
  if (!expectedVars.has(varName) && !CSS_ONLY_VARS.has(varName)) {
    problems.push(`--${varName} in globals.css has no BRAND_COLORS counterpart (add it to brand.ts or CSS_ONLY_VARS)`);
  }
}

if (process.argv.includes("--fix-hint") || problems.length > 0) {
  const block = Object.entries(brand)
    .map(([key, hex]) => `  --${kebab(key)}: ${hex};`)
    .join("\n");
  if (problems.length > 0) {
    console.error("Brand palette drift between brand.ts and globals.css:\n");
    for (const p of problems) console.error(`  ✗ ${p}`);
    console.error("\nExpected :root variables (from BRAND_COLORS; keep any CSS-only extras like --glow):\n");
  }
  console.log(block);
  process.exit(problems.length > 0 ? 1 : 0);
}

console.log(`✓ brand.ts and globals.css agree on ${Object.keys(brand).length} colours`);
