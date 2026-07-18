# Triangle rondo v6 — wide apex-up

This directory preserves the logo that was live immediately before the July 2026 extra-wide v7 update.

- **Glyph circumradius:** 72
- **Disc circumradius:** 64
- **Last live source commit:** `6d2c576`
- **Files:** `glyph.svg` (headers/in-app) and `disc.svg` (favicon/app-icon cut)

The SVGs are complete, scalable copies of the old artwork and are not imported by production code.

## Exact rollback

The safest rollback after the v7 logo commit is to revert that commit. Alternatively, restore every logo surface from the preserved v6 source commit:

```bash
git restore --source=6d2c576 -- \
  apps/mobile/assets/android-icon-foreground.png \
  apps/mobile/assets/android-icon-monochrome.png \
  apps/mobile/assets/favicon.png \
  apps/mobile/assets/icon.png \
  apps/mobile/assets/splash-icon.png \
  apps/mobile/src/components/logo.tsx \
  apps/web/public/brand/email-logo.png \
  apps/web/src/app/favicon.ico \
  apps/web/src/app/icon.svg \
  apps/web/src/app/layout.tsx \
  apps/web/src/components/logo.tsx \
  apps/web/src/lib/brand/rondo-icon.tsx \
  apps/web/src/lib/share/render-performance-image.ts \
  scripts/generate-brand-assets.mjs
```

Then update `docs/BRAND.md` and `docs/CURRENT_STATE.md` to identify v6 as live.
