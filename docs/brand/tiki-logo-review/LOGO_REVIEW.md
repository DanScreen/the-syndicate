# Logo review — Triangle rondo (July 2026) — SHIPPED

| Field | Value |
|-------|-------|
| **Status** | **T4 shipped** as the production mark (July 2026) |
| **Chosen** | Triangle rondo, "heavy cut" — friend's "One Two" arrow grammar applied to a passing triangle |
| **Reference** | [the_one_two_poppins_on_white.svg](./the_one_two_poppins_on_white.svg) — the give-and-go mark whose style (solid pass arrows + player dots) this borrows |
| **Exploration board** | [triangle-rondo-board.png](./triangle-rondo-board.png) · regenerate via [triangle-rondo.html](./triangle-rondo.html) |

---

## The mark

An equilateral passing triangle circulating clockwise — tiki-taka distilled:

- **White pass** up the left (build-up) → **accent pass** into the green player (the killer ball) → **bright pass** back along the base (recycle). The ball never stops.
- Three player dots at the vertices; the green one is the finisher.
- The **mark asset contains no text**; headers render the “Tiki **Acca**” wordmark beside it (no tagline).

## Geometry (exact, symmetric by construction)

- viewBox `0 0 220 220`; vertices at **−90° / 30° / 150°** on the circumradius; centroid exactly at **(110,110)**.
- Glyph cut: R=58, dots r=16, stroke 11. Disc cut: R=52, dots r=14.5, stroke 10, disc r=106 `#14532d`.
- Arrow tips are **explicit chevron paths** at the same stroke weight as the lines — no SVG `marker`/`context-stroke`, so browsers, Satori (`ImageResponse`), resvg, and the canvas share-image renderer all draw it identically.
- Regenerate coordinates: the derivation lives in this review's git history (python snippet computing vertices/gaps/chevrons).

## Two cuts

| Cut | Where | File |
|-----|-------|------|
| **Glyph** (no disc) | Site headers, in-app | `apps/web/src/components/logo.tsx` (`LogoMark`, `Logo`) |
| **Disc** (deep-green circle) | Favicon, apple-touch, app icons, splash | `apps/web/src/app/icon.svg`, `favicon.ico`, `apple-icon.tsx` + `lib/brand/rondo-icon.tsx`, `apps/mobile/assets/*` |

The disc exists because white arrows on a transparent favicon disappear on light browser tabs; in-page the glyph sits directly on the dark UI.

## Surfaces updated (July 2026)

- `logo.tsx` — glyph mark; `Logo` renders mark only (wordmark removed)
- `app/icon.svg` (SVG favicon) · `app/favicon.ico` (16/32/48) · `app/apple-icon.tsx`
- `lib/share/render-performance-image.ts` — canvas mark on share cards
- `apps/mobile/assets/` — `icon.png` (full-bleed 1024), `splash-icon.png`, `android-icon-{foreground,background,monochrome}.png`, `favicon.png`

## Not chosen

T1 (give-and-go triangle, friend's forest/gold palette), T2 (full circulation, friend's palette), T3 (light-stroke Turf Green) — see the board. The friend's gold accent was not adopted; the mark stays inside Turf Green tokens.
