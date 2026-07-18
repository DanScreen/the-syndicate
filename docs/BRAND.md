# Brand & design

Visual identity for Tiki Acca.

**Renamed (July 2026):** **The Syndicate → Tiki Acca** — tiki-taka pun; everyone touches the ball, each member adds one leg. Groups are called **"groups"** (the noun "syndicate" is retired). Full rationale + rename scope: [specs/rename-tiki-acca.md](./specs/rename-tiki-acca.md). Legacy internals that deliberately keep old names: GCP resources (Cloud SQL `the_syndicate`, Cloud Run `the-syndicate-web`, artifact repo), mobile SecureStore keys, GitHub repo name, `lib/brand/archive.ts` history.

**Palette (July 2026):** **Floodlight** — sky-blue accent on floodlit navy, chosen from the eight-scheme exploration (replaced Turf Green, which had doubled as both brand and success colour). Logo remains the **Triangle rondo** (see [brand/tiki-logo-review/](./brand/tiki-logo-review/LOGO_REVIEW.md)).

**Messaging & copy direction:** [MARKETING_BRIEF.md](./MARKETING_BRIEF.md) — positioning territories, tagline options, homepage/about page structure (draft, tagline decision open).

---

## Positioning

| | |
|---|---|
| **What** | Social group football acca platform |
| **Who** | Friend groups, pub groups, office leagues |
| **Tone** | Confident, social, data-forward — mates first, not a tipster |
| **Tagline** | Social group accas (SEO/meta descriptor) |
| **Header descriptor** | Social Group Betting (marketing top bar, right of wordmark) |
| **Headline** | Your Mates. One Acca. Every Leg Counts. |

We are **not** a bookmaker. Copy and UI must always make clear users place bets with licensed operators.

**Approved future competitive campaign line (not live):**

> **Think you know football? Prove it.**
>
> **Real picks. Real odds. Real results.**

Use this as a secondary competitive/proof theme, not a replacement for the social
group headline. Supporting copy may contrast Tiki Acca's transparent real-odds,
unit-stake scoring with arbitrary fantasy scoring, but must not promise profit,
claim lasting skill from a short sample, or imply that Tiki Acca supplies tips.

---

## Logo (live)

**Triangle rondo** (extra-wide apex-up cut, July 2026) — an equilateral passing triangle with its apex at the top: **three white players** at the points with **white passes** circulating between them, and a **sky-blue player in the centre** being passed around (the rondo "piggy in the middle"). The outer players were widened away from the centre after visual review: glyph circumradius **86** (formerly 72), disc circumradius **76** (formerly 64). Two cuts: **glyph** (standalone, headers/in-app) and **disc** (accent-muted blue circle behind, favicon/app icons). Geometry is centred at `(110,110)` with explicit chevron arrow tips, and the same baked coordinates are used across DOM, React Native, Satori, SVG, and canvas cuts.

**Surfaces (keep in sync):** `apps/web/src/components/logo.tsx` (`LogoMark`/`Logo` glyph), `app/icon.svg` + `lib/brand/rondo-icon.tsx` (disc; apple-icon + blog OG image), `favicon.ico`, `lib/share/render-performance-image.ts` (canvas), `apps/mobile/src/components/logo.tsx` (glyph), and `apps/mobile/assets/*.png` (app icons). Bump the `?v=` favicon cache-bust in `layout.tsx` on any change.

**Rollback archive:** the preceding v6 wide apex-up vectors and exact restoration instructions are preserved in [`docs/brand/logo-archive/v6-wide-apex-up/`](./brand/logo-archive/v6-wide-apex-up/).

**Wordmark:** “Tiki **Acca**” — “Acca” in accent colour, rendered beside the mark in headers (`Logo`). No tagline beside the logo. The mark asset itself contains no text.

---

## Typography

| Role | Font | Usage |
|------|------|-------|
| Body | Geist Sans | App UI, forms, data |
| Display | Outfit | Marketing headings (`font-display`) |

Loaded in `apps/web/src/app/layout.tsx`.

---

## Colour — Floodlight

Source of truth: `BRAND_COLORS` in `packages/shared/src/brand.ts`. The web app mirrors
it as CSS variables in `apps/web/src/app/globals.css`; mobile imports `BRAND_COLORS`
directly. `npm run check:brand` (also run by `npm run lint`) fails if the two drift —
`node scripts/check-brand-sync.mjs --fix-hint` prints the expected `:root` block.

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#091422` | Page background |
| Card | `#0f1b2d` | Cards, header |
| Accent | `#38bdf8` | CTAs, highlights (brand only — never win/loss state) |
| Accent bright | `#7dd3fc` | Hover states |
| Foreground | `#f1f5f9` | Body text |
| Muted | `#8fa3bb` | Secondary text |
| Success / strong | `#4ade80` / `#22c55e` | Won legs, positive points (text / surface-border) |
| Danger / strong | `#f87171` / `#ef4444` | Lost legs, errors, unread badge (text / surface-border) |
| Warning | `#fbbf24` | Waiting/attention copy |
| On accent | `#000000` | Text on accent-filled CTAs |

Semantic tones are independent of the accent: won/lost/waiting states keep their green,
red, and amber regardless of the brand colour (this is what made the Turf Green →
Floodlight switch safe).

**Re-theme procedure:** update `BRAND_COLORS` in `packages/shared/src/brand.ts`; run
`node scripts/check-brand-sync.mjs --fix-hint` and paste the printed block into
`globals.css` (re-tint `--glow` to the new accent); update the two fills in
`app/icon.svg`; run `npm run generate:brand-assets` to regenerate `favicon.ico` and
`apps/mobile/assets/*.png`; bump the `?v=` favicon cache-bust in `layout.tsx`; update
the table above. Check `apps/mobile/app.json` (splash/adaptive-icon backgrounds,
Android notification colour) — it can't import `BRAND_COLORS`.

---

## Marketing pages

| Route | Purpose |
|-------|---------|
| `/` | Homepage — hero, value props, how it works, FAQ, CTA |
| `/about` | Product story, what we are/aren’t, responsible gambling |
| `/blog`, `/blog/[slug]` | File-based MDX blog (static; `draft: true` hidden in prod) |

Shared shell: `MarketingShell` + `SessionAwareMarketingHeader` (client session so static `/blog` keeps signed-in chrome) in `apps/web/src/components/marketing/`. Signed-out: Home / About / Blog / Sign in / Sign up (peer links — no accent CTA in the header). Below `md`, those links sit in a hamburger menu (`mobile-nav.tsx`) so the top bar stays one compact row on phones. Favicon metadata uses `?v=` cache-bust in `app/layout.tsx` — bump when the mark changes.

Content: `apps/web/src/lib/marketing-content.ts`.

---

## Cross-platform brand

The same identity applies to **website**, **in-app mobile**, and **App Store / Play Store** listings.

| Surface | Logo | Tagline / copy | Colours |
|---------|------|----------------|---------|
| Website | SVG `apps/web/src/components/logo.tsx` | `apps/web/src/lib/marketing-content.ts` | `apps/web/src/app/globals.css` |
| Mobile app | PNG assets `apps/mobile/assets/` + in-app SVG `apps/mobile/src/components/logo.tsx` | Shared module (`packages/shared/src/brand.ts` for colours) | `apps/mobile/src/config.ts` imports `BRAND_COLORS` |
| Store listings | Icon + screenshots | [apps/mobile/STORE_LISTING.md](../apps/mobile/STORE_LISTING.md) | N/A |

### Logo export (mobile / stores)

1. Source of truth: **Triangle rondo** — glyph in `logo.tsx`, disc in `app/icon.svg` / `lib/brand/rondo-icon.tsx`.
2. Export PNGs at required sizes for:
   - `apps/mobile/assets/icon.png` (1024×1024)
   - `apps/mobile/assets/splash-icon.png`
   - Android adaptive icons (`android-icon-foreground.png`, etc.) — see `apps/mobile/app.json`
3. Update store screenshots when marketing hero changes.

### Avoiding divergence

- **Centralize** tagline, headline, and colour hex values in one shared module before heavy mobile UI work.
- **Do not** hardcode marketing copy only in mobile screens.
- Rebrand on web first, then export icons and sync mobile tokens.

Mobile strategy: [specs/mobile-apps.md](./specs/mobile-apps.md).

---

## Archived explorations

Rejected logo and palette options are kept for reference (not linked in the app):

| Path | Contents |
|------|----------|
| `apps/web/src/lib/brand/archive.ts` | Archived design concepts + logo variant metadata |
| `apps/web/src/lib/brand/logo-alternatives.tsx` | SVG components: crest, pitch, monogram, nodes |
| `docs/brand/logo-review/LOGO_REVIEW.md` | **July 2026** — AI-generated betslip concepts (2 won + 1 pending legs); not shipped |

---

## Open decisions

- [x] Favicon / app icons from Triangle rondo mark (`app/icon.svg`, `app/favicon.ico`, `app/apple-icon.tsx`, `apps/mobile/assets/*`)
- [ ] Apply `font-display` to authenticated app page titles
