# Design & UX Review — Tiki Acca

_Reviewer: Claude Opus 4.8 · Date: 2026-07-18_

Scope: design system, marketing site (`apps/web`), authenticated web app, and the
native mobile client (`apps/mobile`) across the primary flows (onboarding, pick
submission, betslip/lock, dashboard, chat).

---

## Overall impression

A genuinely well-considered product with a coherent identity and a strong grasp of
its own concept. The tiki-taka → "everyone touches the bet" metaphor does real work —
it justifies the whole product mechanic and the copy carries it through consistently.

- **Marketing site** — strongest surface.
- **Authenticated web app** — functional and clear, a notch less polished.
- **Native mobile app** — clean but slightly under-branded.

Biggest opportunities: (1) close the polish gap between marketing and in-app, (2)
tighten cross-platform consistency, (3) fix a handful of concrete accessibility and
small-type issues.

---

## What's working well

- **Single source of truth for brand.** `BRAND_COLORS` in `packages/shared` feeds both
  `apps/web/src/app/globals.css` and mobile `apps/mobile/src/config.ts`. This is the
  discipline most cross-platform products fail at, and `docs/BRAND.md` explicitly guards
  against divergence.
- **Marketing homepage narrative** (`apps/web/src/app/page.tsx`): hero → product mock →
  value props → how-it-works → audiences → FAQ → CTA is textbook and well-paced. The
  faux browser-chrome product preview (three named legs collapsing into "Combined odds
  5.26 · Open betslip") communicates the entire value prop in one glance — the best
  single asset on the site.
- **Domain micro-copy.** Status banners ("Waiting on 2 legs. Acca locks at first
  kickoff." / "Members who haven't finished their picks will miss this acca.") are
  precise and reduce anxiety at the right moments. The bookmaker-comparison UI
  (`AccaSummary`) with ranked medal badges and deeplink/hub/multi-leg CTA hints handles
  genuinely hard domain complexity well.
- **Trust & compliance handled with taste** — "We're not a bookmaker… we keep the
  score. 18+" repeated where it matters without being preachy.
- **Solid empty / loading / waiting states** across both platforms.

---

## Issues, prioritized

### High — a real UX bug

**New users see two competing onboarding blocks.**
In `apps/web/src/app/dashboard/page.tsx`, `isNewUser` (line 46) and the
`memberships.length === 0` branch (line 114) are the *same* condition, so a brand-new
user gets **both** the green "Welcome to Tiki Acca" panel with a "Create your first
group" button *and*, directly below it, the dashed "No groups yet… Create a group" box.
Two empty states, two create CTAs, stacked.
**Fix:** keep the welcome panel; drop the dashed box when `isNewUser`.

### Medium — cross-platform consistency

- **Same screen, two different hierarchies.** Web dashboard leads with an H1 "Your
  groups" (`text-2xl font-bold`) plus a "Hi, {name}" affordance; mobile home
  (`apps/mobile/app/(main)/home.tsx`) leads with a tiny uppercase `sectionLabel` and no
  title or greeting. The native app feels flatter/more anonymous. Give mobile a real
  screen title (and ideally the greeting).
- **Web-mobile vs native navigation diverge.** Native uses a persistent bottom tab bar
  (Groups / Performance / Account) — correct for this product. Authenticated web on a
  phone falls back to a hamburger (`MobileNav`). A persistent bottom bar on mobile web
  would match the native mental model and cut taps.
- **Design-token drift.** Buttons in `dashboard/page.tsx` use `hover:bg-green-400` (raw
  Tailwind) while the rest of the app uses `hover:bg-accent-bright` (token). They resolve
  to nearly the same green today, so it's invisible — but it defeats the token's purpose
  and will drift when the accent changes. Normalize to the token.
- **Unicode glyphs vs the SVG icon system.** `AccaSummary`'s compare toggle renders
  `▲`/`▼` as text characters, and submitted state uses a literal "✓". Everywhere else
  there's a clean stroked SVG icon set (homepage, tab bar). The raw glyphs look crude and
  render inconsistently across platforms.

### Medium — polish gap between marketing and app

The display font (Outfit) and more considered spacing live only on marketing pages; the
authenticated app is all Geist Sans and reads more utilitarian. `docs/BRAND.md` already
flags this as an open decision ("Apply `font-display` to authenticated app page titles" —
still unchecked). Applying the display face to app page titles (Dashboard, group name,
Leaderboard) is a cheap, high-impact way to make the paid experience feel as crafted as
the pitch.

### Medium — accessibility & type sizing

- **Sub-12px type carries important information.** Hint text at `text-[11px]`
  (`AccaSummary` CTA hints, line ~722) and badges at `text-[10px]` (line ~760) carry real
  information (link quality, ranking). Below comfortable reading size and, combined with
  `text-muted` (#94a3b8), pushing against WCAG AA. Bump hints to ≥12px.
- **Green-on-green contrast.** Banners render `text-accent` (#22c55e) on
  `bg-accent-muted/40` (translucent dark green) — the weakest contrast pairing in the app.
  Verify ≥4.5:1; if not, use `accent-bright` or set banner body to `foreground` and
  reserve accent for the label.
- **Red unread badge collides semantically with "lost".** `bg-red-500` for the "N new"
  count competes with the red used for lost legs / danger. Unread is a neutral/positive
  signal — use accent or a neutral badge so red stays reserved for negative outcomes.
- **Focus states.** No custom `focus-visible` styling observed; interactive cards/buttons
  appear to rely on hover + browser defaults, which are easy to miss on a dark theme. Add
  an explicit accent focus ring for keyboard users.

### Low — nice-to-haves

- **Dark-only, not theme-aware.** Fixed dark palette suits the sports/betting mood — a
  legitimate choice — but there's no light mode or `prefers-color-scheme` support.
- **The pick flow is one long scroll.** `SubmitLegForm` stacks competition → fixture →
  market → selection → "load more market tiers" vertically. Numbered steps and progressive
  reveal keep it manageable, but a stepper/wizard would reduce the wall-of-form feel on
  mobile web.
- **Text loaders over skeletons.** "Loading competitions…" / "Loading fixtures…" are fine;
  skeleton placeholders would read more premium and reduce layout shift.

---

## Five quick wins

1. Fix the double onboarding block for new users (`dashboard/page.tsx`).
2. Give the mobile home screen a real title + greeting to match web.
3. Apply the display font to in-app page titles (already on the brand to-do).
4. Bump sub-12px hint text and re-check the green-on-green banner contrast.
5. Replace `▲▼`/`✓` glyphs and the `green-400` literal with the icon set and accent token.
