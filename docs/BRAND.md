# Brand & design

Visual identity for Tiki Acca.

**Renamed (July 2026):** **The Syndicate → Tiki Acca** — tiki-taka pun; everyone touches the ball, each member adds one leg. Groups are called **"groups"** (the noun "syndicate" is retired). Full rationale + rename scope: [specs/rename-tiki-acca.md](./specs/rename-tiki-acca.md). Legacy internals that deliberately keep old names: GCP resources (Cloud SQL `the_syndicate`, Cloud Run `the-syndicate-web`, artifact repo), mobile SecureStore keys, GitHub repo name, `lib/brand/archive.ts` history.

**Locked (July 2026):** Turf Green palette + **Triangle rondo** logo (replaced the Acca stack at the Tiki Acca rename — see [brand/tiki-logo-review/](./brand/tiki-logo-review/LOGO_REVIEW.md)).

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
| **Headline** | Your mates. One acca. Every leg counts. |

We are **not** a bookmaker. Copy and UI must always make clear users place bets with licensed operators.

---

## Logo (live)

**Triangle rondo** — an equilateral passing triangle circulating clockwise (white build-up pass, accent killer pass into the green player, bright recycle along the base). Two cuts: **glyph** (standalone, headers/in-app) and **disc** (deep-green circle behind, favicon/app icons). Geometry is exact: vertices at −90°/30°/150°, centroid at the viewBox centre — symmetrical by construction. Arrow tips are explicit chevrons (no SVG markers) so all rasterisers agree.

**Component:** `apps/web/src/components/logo.tsx` — `LogoMark`, `Logo`.

**Wordmark:** “Tiki **Acca**” — “Acca” in accent colour, rendered beside the mark in headers (`Logo`). No tagline beside the logo. The mark asset itself contains no text.

---

## Typography

| Role | Font | Usage |
|------|------|-------|
| Body | Geist Sans | App UI, forms, data |
| Display | Outfit | Marketing headings (`font-display`) |

Loaded in `apps/web/src/app/layout.tsx`.

---

## Colour — Turf Green

Tokens in `apps/web/src/app/globals.css` and `packages/shared/src/brand.ts` (mobile imports `BRAND_COLORS`):

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#0b1220` | Page background |
| Card | `#111827` | Cards, header |
| Accent | `#22c55e` | CTAs, highlights |
| Accent bright | `#4ade80` | Hover states |
| Foreground | `#f1f5f9` | Body text |
| Muted | `#94a3b8` | Secondary text |

---

## Marketing pages

| Route | Purpose |
|-------|---------|
| `/` | Homepage — hero, value props, how it works, FAQ, CTA |
| `/about` | Product story, what we are/aren’t, responsible gambling |
| `/blog`, `/blog/[slug]` | File-based MDX blog (static; `draft: true` hidden in prod) |

Shared shell: `MarketingShell` + `SessionAwareMarketingHeader` (client session so static `/blog` keeps signed-in chrome) in `apps/web/src/components/marketing/`. Signed-out: Home / About / Blog / Sign in / Sign up. Favicon metadata uses `?v=` cache-bust in `app/layout.tsx` — bump when the mark changes.

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
