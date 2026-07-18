# Design & UX Review — Tiki Acca (Claude Fable 5)

_Reviewer: Claude Fable 5 · Date: 2026-07-18_

Scope: design system and brand docs, marketing site (`apps/web`), authenticated web
app (dashboard, group experience, auth, chat), and the native mobile client
(`apps/mobile` — shared UI kit, tab bar, home screen).

This is an independent pass, done alongside (not derived from)
[DESIGN_REVIEW_opus-4-8.md](./DESIGN_REVIEW_opus-4-8.md). Where the two overlap it is
noted; the headline differences here are in accessibility and interaction-state
details.

---

## Verdict

A well-crafted product with a genuinely coherent identity. The design discipline is
unusually good for a project at this stage: one palette (`BRAND_COLORS` in
`packages/shared`) feeds web and mobile, `docs/BRAND.md` documents the system and
guards against drift, and the domain microcopy ("Waiting on 2 legs. Acca locks at
first kickoff.") is precise where it matters most.

The gradient of polish runs **marketing site > web app > mobile app** — the biggest
opportunity is pulling the two app surfaces up to the marketing site's level.

---

## What's working well

- **The marketing homepage** (`apps/web/src/app/page.tsx`) has textbook narrative
  pacing: hero → product mock → value props → how-it-works → audiences → FAQ →
  closing CTA. The faux-browser product preview with three named legs collapsing into
  "Combined odds 5.26 · Open betslip" explains the entire product in one glance.
- **The leg-submission flow** (`group-ui.tsx:376`) uses a numbered
  progressive-disclosure stepper (1. competition → 2. fixture → 3. market →
  4. selection) with taken-market blocking and a "best odds" explainer before submit.
  This is the hardest flow in the product and it's handled well.
- **State design is thorough**: provisional vs. locked odds copy, per-leg outcome
  colouring, pending-member lists, unread badges, empty states on both platforms,
  pull-to-refresh on mobile.
- **Compliance has taste** — "We're not a bookmaker… we keep the score. 18+" appears
  where it should without dominating.

---

## High priority

1. **Form inputs have no associated labels.** In
   `apps/web/src/app/sign-in/page.tsx:66` (and sign-up), `<label>` has no `htmlFor`
   and inputs have no `id`. Screen readers announce unlabelled fields, and clicking
   the label doesn't focus the input. The same pattern likely repeats wherever forms
   exist. Cheapest meaningful accessibility fix in the codebase.

2. **Selection state is colour-only.** In the pick stepper, a selected
   competition/fixture/market/selection differs from unselected only by border colour
   (`border-accent` vs `border-border`) with no `aria-pressed`, no checkmark, no
   weight change. For colour-blind users on a dark background, green vs. slate-grey
   1px borders are hard to distinguish. Add `aria-pressed` and a non-colour cue
   (check icon, or filled background plus bolder text).

3. **Group tab nav overflows on small screens.**
   `apps/web/src/components/group-nav.tsx:51` renders up to five tabs in a
   non-wrapping flex row with `px-4` padding and no `overflow-x-auto`. On a
   320–375px viewport, "Round / History / Leaderboard / Performance / Settings" will
   clip. Add `overflow-x-auto` with an edge fade, or tighten padding below `sm`.

4. **Mobile pressables give no pressed feedback.** `Button`, `Card`-wrapping
   `Pressable`s, and `OptionRow` in `apps/mobile/src/components/ui.tsx` define no
   pressed state — RN `Pressable` shows nothing by default, so taps feel dead. Use
   the `style={({ pressed }) => ...}` form to drop opacity or shift background on
   press, and add `accessibilityRole="button"`. (The tab bar already does the a11y
   part right with `accessibilityRole="tab"`.)

5. **The dashboard will get slow, and it's the front door.**
   `apps/web/src/app/dashboard/page.tsx:123-193` awaits `openRound` and an
   unread-count query *per group inside the render map*. This is a UX problem, not
   just a perf nit — the page users hit every visit gets slower linearly with group
   count. Batch the unread counts into one grouped query.

---

## Medium priority

6. **Token discipline slips at the edges.** The system defines `--accent-bright` for
   hover, but half the CTAs use raw `hover:bg-green-400` (`group-ui.tsx:590`,
   `dashboard/page.tsx:86`) while others use `hover:bg-accent-bright`
   (`sign-in/page.tsx:91`). Web has no semantic danger/warning tokens, so
   `red-400`/`amber-400` appear raw throughout; mobile *has* `colors.danger` but also
   hardcodes `"#fbbf24"`, `"#fff"`, `"#000"` (`home.tsx:334`). Add
   `--danger`/`--warning` tokens and sweep.

7. **Mobile is under-branded.** The web app has Outfit display type, the glass-card
   treatment, and the accent gradient; mobile is system font throughout with flat
   cards — a competent generic dark app rather than Tiki Acca. Loading Outfit via
   `expo-font` for screen titles alone would close most of the gap. Relatedly, the
   "Groups" tab icon (`app-tab-bar.tsx:44`) — a card of dots — reads as "bingo card"
   at 23px; a people/group glyph would match its label.

8. **Odds are rendered unformatted.** `combinedOdds` and `leg.odds` are interpolated
   raw (`group-ui.tsx:692,900`). Float arithmetic will eventually print
   `5.26666666`. Format odds to two decimals in one shared helper on both platforms.

9. **Disclosure affordances are text glyphs.** The bookmaker-compare toggle uses
   literal `▲`/`▼` characters with no `aria-expanded` (`group-ui.tsx:729-741`). Swap
   for a rotating chevron SVG and set `aria-expanded`.

10. **Sub-minimum text sizes.** Rank badges at `text-[10px]` and CTA hints at
    `text-[11px]` (`group-ui.tsx:722,760`) are below comfortable reading size, and
    the hint carries genuinely important instructions ("Opens the first selection.
    Use Open on each pick…"). That content deserves ≥12px or a different placement.

11. **Two taglines are in circulation.** BRAND.md locks "Your Mates. One Acca. Every
    Leg Counts." while the homepage closing CTA uses "One Leg Each. Best Odds Locked.
    Bragging Rights Forever." (`page.tsx:173`). BRAND.md admits the decision is
    open — worth closing, because the closing CTA is where the tagline should land
    hardest.

---

## Low priority / polish

- **"Hi, {userName}" is the account link** (`header.tsx:69`) with only a `title`
  tooltip hinting it's clickable. A small avatar circle or chevron would make it
  discoverable.
- **"Cancel. Keep my current pick"** (`group-ui.tsx:606`) — the mid-label full stop
  reads oddly; "Cancel — keep my current pick" or just "Keep my current pick".
- **Mixed ellipses**: `"Loading..."` and `"Loading…"` both appear; pick one (the
  typographic `…`).
- **Unread badge contrast**: white on `bg-red-500` at 11px semibold is roughly 4:1 —
  passes for large text only. Darken the red slightly.
- **"Who it's for" section** visually duplicates the value-props cards directly above
  it (same card style, title + muted body). Differentiating the treatment (e.g.,
  quote-style or persona-led) would restore rhythm.
- **Chat polls every 20s** (`group-chat.tsx:22`) — fine for now, but banter is the
  retention surface; note SSE/websockets on the roadmap so reactions feel live.
- **`group-round.tsx` at 1,312 lines** is the design-debt canary on mobile: iterating
  on the most important screen is hardest exactly where polish is most needed.

---

## Suggested order of attack

1. Label/input association + `aria-pressed` on pickers (an hour, big a11y win).
2. Group-nav overflow + mobile pressed states (small, felt immediately).
3. Semantic colour tokens + hover-token sweep.
4. Odds formatting helper.
5. Outfit on mobile titles + tab icon redesign.
6. Dashboard query batching.