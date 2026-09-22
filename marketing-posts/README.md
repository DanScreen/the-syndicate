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

## Video ad captures ("The Cage")

Real app screens for the AI video ad in
[`docs/VIDEO_AD_BRIEF.md`](../docs/VIDEO_AD_BRIEF.md) §7. Cast, picks, odds and
story stages live in `video-ad/scenario.json`; edit that one file to change a
name, fixture or price.

```bash
docker compose up -d && npm run db:migrate:deploy
npm run dev                                   # keep running
npm run video-ad:capture                      # every stage + the leaderboard
npm run video-ad:capture -- --stage=red-locked
npm run video-ad:capture -- --leaderboard-frames   # also L1 count-up frames
npm run video-ad:capture -- --initials        # no profile pictures (app as shipped)
```

The capture re-seeds the two demo groups (Tuesday Reds, Tuesday Blues) before
each stage with `npm run video-ad:seed -- --stage=<name>`, so run it against a
local database only. Output lands in `video-ad/captures/<beat>-<stage>/`
(git-ignored) at iPhone 15 Pro resolution (1179×2556), plus `manifest.json`:

| Beat | Stage | Shows |
|------|-------|-------|
| S1–S3 | `red-1`…`red-3` | Red betslip filling one named leg at a time; Kev still pending; combined odds 1.40 → 2.94 → 9.55 |
| S4 | `red-locked` | Kev's Coventry 6.00 in, acca locked at 57.33 |
| S5 | `red-settled` | Settled card: three Won, Kev Lost, group −1 pts |
| S6 | `blue-won-1`…`3` | Blue legs landing Won one by one |
| S7 | `blue-settled` | Settled card: four Won, group 12.5 pts, Acca @ 13.50 |
| L1 | `leaderboard` | Composite leaderboard: team points, then every player's points |

Profile pictures come from `video-ad/avatars/<member key>.png` (see the README
there); members without one get an initials placeholder. The capture also
restores pass order in lists (the active betslip has no defined leg order),
hides the signed-in member's own Change/Remove controls and the Next.js dev
badge. Everything else on screen is the app as it renders.

Sign-in is rate limited to 10 per 5 minutes per IP; a full run signs in three
times. If the repo's Playwright build is not installed, point
`MARKETING_CHROMIUM_PATH` at a local Chromium.

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
