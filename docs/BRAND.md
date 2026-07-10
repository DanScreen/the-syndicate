# Brand & design

Visual identity for The Syndicate.

**Locked (July 2026):** Turf Green palette + Acca stack logo.

---

## Positioning

| | |
|---|---|
| **What** | Social group football acca platform |
| **Who** | Friend groups, pub syndicates, office leagues |
| **Tone** | Confident, social, data-forward — mates first, not a tipster |
| **Tagline** | Social group accas |
| **Headline** | Your mates. One acca. Every leg counts. |

We are **not** a bookmaker. Copy and UI must always make clear users place bets with licensed operators.

---

## Logo (live)

**Acca stack** — three stacked bars like betslip legs, on a rounded square.

**Component:** `apps/web/src/components/logo.tsx` — `LogoMark`, `Logo`.

**Wordmark:** “The **Syndicate**” — “Syndicate” in accent colour.

---

## Typography

| Role | Font | Usage |
|------|------|-------|
| Body | Geist Sans | App UI, forms, data |
| Display | Outfit | Marketing headings (`font-display`) |

Loaded in `apps/web/src/app/layout.tsx`.

---

## Colour — Turf Green

Tokens in `apps/web/src/app/globals.css`:

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

Shared shell: `MarketingShell` + `MarketingHeader` in `apps/web/src/components/marketing/`.

Content: `apps/web/src/lib/marketing-content.ts`.

---

## Archived explorations

Rejected logo and palette options are kept for reference (not linked in the app):

| Path | Contents |
|------|----------|
| `apps/web/src/lib/brand/archive.ts` | Archived design concepts + logo variant metadata |
| `apps/web/src/lib/brand/logo-alternatives.tsx` | SVG components: crest, pitch, monogram, nodes |

---

## Open decisions

- [ ] Favicon / OG image from Acca stack mark
- [ ] Apply `font-display` to authenticated app page titles
