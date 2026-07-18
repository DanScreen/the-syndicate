# Design review triage — decisions

_Date: 2026-07-18 · Sources: [DESIGN_REVIEW_fable-5.md](./DESIGN_REVIEW_fable-5.md) [F] and
[DESIGN_REVIEW_opus-4-8.md](./DESIGN_REVIEW_opus-4-8.md) [O] · Sign-off: Daniel_

Findings from both reviews, de-duplicated and triaged. The colour/token findings from
both reviews were already closed by the Floodlight re-theme (semantic tokens, literal
class sweep, `check:brand` guard) before this triage.

## Accepted — implemented in this pass

| # | Change | Source |
|---|--------|--------|
| 1 | Fix double onboarding block on dashboard (welcome panel + empty-state box both rendered for new users) | O |
| 2 | Associate form labels (`htmlFor`/`id`) on sign-in, sign-up, create/join group forms | F |
| 3 | `aria-pressed` + non-colour selected cue (check icon) on pick-stepper buttons | F |
| 4 | `overflow-x-auto` on group tab nav so five tabs don't clip on phones | F |
| 5 | Mobile pressed-state feedback + `accessibilityRole="button"` on Button/Card/OptionRow | F |
| 6 | Replace `▲▼`/`✓` text glyphs with SVG chevron/check + `aria-expanded` | F+O |
| 7 | Bump sub-12px text (CTA hints, rank badges) to ≥12px | F+O |
| 8 | Global `focus-visible` accent ring | O |
| 9 | Recolour unread badge from red to accent — unread is neutral/positive; red stays reserved for lost/danger | O |
| 10 | Shared 2dp odds formatter, applied on both platforms | F |
| 11 | Mobile home: real screen title + greeting to match web hierarchy | O |
| 12 | Redesign "Groups" tab icon (dots-card → people glyph) | F |
| 13 | Display font (Outfit) on web app page titles (was an open BRAND.md item) | O |
| 14 | Batch dashboard unread-count queries (N+1 → one query) | F |
| 15 | Copy nits: cancel-button punctuation, ellipsis consistency, banner contrast check under Floodlight | F+O |
| 16 | Bottom tab bar for authenticated mobile web, matching the native app's mental model | O — promoted from defer at sign-off |

## Deferred — worth doing, not in this pass

| Change | Source | Why deferred |
|--------|--------|--------------|
| Outfit font on mobile (expo-font + new dependency) | F | New dependency; land title/greeting first |
| Pick-flow stepper/wizard | O | Big UX change to the riskiest flow; numbered scroll works today |
| Skeleton loaders | O | Polish; low value relative to effort now |
| "Who it's for" marketing section redesign | F | Design-taste exercise, separate pass |
| Chat SSE/websockets | F | Infrastructure, not design |
| `group-round.tsx` (1,312-line) refactor | F | No visual change; do when next touching that screen |

## Rejected / open decisions

| Item | Source | Reasoning |
|------|--------|-----------|
| Light mode | O | Dark-only is a deliberate brand commitment |
| Tagline unification ("Your Mates…" vs "One Leg Each…") | F | Marketing decision, tracked as open in BRAND.md — not a code change |
