# Marketing post workflow

Reusable social graphics built from real Tiki Acca UI. The current set is a
draft for review, not a record of published posts.

## Structure

- `_raw-screenshots/` — source UI captures.
- `square/` — 1080×1080 PNGs.
- `story/` — 1080×1920 PNGs.
- `x-twitter/` — 1600×900 PNGs.
- `scripts/concepts.mjs` — shared concept, copy, source, and approval-tier list.
- `scripts/make-posts.mjs` — branded image composer.
- `scripts/make-x-header.mjs` — 1500×500 X account header.
- `scripts/capture-panels.mjs` — automated chart and bookmaker-panel capture.
- `scripts/build-gallery.mjs` — self-contained `gallery.html` review page.

## First-time setup

From the repository root:

```bash
npm install
npx playwright install chromium
docker compose up -d
```

Playwright and Sharp are direct development dependencies so the workflow does
not depend on packages pulled in transitively by the web app.

## Refresh the source UI

The demo seed is destructive only to users with `@demo.tikiacca.com` addresses
and the `DEMO24` group. Never point the local `DATABASE_URL` at production.

```bash
npm run marketing:seed
npm run dev
```

Keep the dev server running at `http://localhost:3000`, then in another terminal:

```bash
npm run marketing:capture
```

Set `MARKETING_BASE_URL=http://localhost:3002` if Next.js selected another port.
This refreshes:

- `04a-group-chat.jpg` — the complete group-chat panel.
- `05b-performance-chart.jpg` — the complete member-points chart only.
- `07-best-acca-odds.jpg` — the expanded bookmaker comparison only.

The other source captures are intentionally retained as approved manual mobile
views. If recapturing them, use a 1062×1148 viewport, keep the app chrome
visible, and avoid clipping page titles or primary content.

## Edit and regenerate

1. Edit `scripts/concepts.mjs` for copy, order, source image, or `core`/`alt`
   status.
2. Use `layout: "panel"` for wide UI sections that must remain fully visible.
3. Generate every platform:

```bash
npm run marketing:build
npm run marketing:gallery
npm run marketing:x-header
open marketing-posts/gallery.html
```

The composer overwrites files listed in the manifest. Remove obsolete generated
PNGs when deleting or renaming a concept.

## Review checklist

- Product values, names, dates, odds, and points look plausible.
- No screenshot is clipped at the top or obscured by fixed navigation.
- Headlines follow `docs/BRAND.md`; factual UI remains unaltered.
- Avoid tipster language such as “guaranteed”, “risk-free”, or “free money”.
- Confirm the final compliance wording before paid publication.
- Stage `marketing-posts/` explicitly; do not stage unrelated untracked files.
