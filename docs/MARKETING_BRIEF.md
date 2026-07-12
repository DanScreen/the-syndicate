# The Syndicate — Design & Marketing Brief

| Field | Value |
|-------|-------|
| **Status** | Draft for review — tagline decision open |
| **Date** | July 2026 |
| **Scope** | Positioning, tagline, homepage (`/`), about page (`/about`), design & voice rules |
| **Constraints** | Turf Green palette + Acca stack logo are **locked** ([BRAND.md](./BRAND.md)). This brief evolves the locked brand; it does not replace it. |
| **Copy source of truth** | `apps/web/src/lib/marketing-content.ts` |

---

## 1. The core insight

Group betting already happens — in WhatsApp, badly. Screenshots of betslips, arguments about whose pick died, a spreadsheet someone abandoned in November. The Syndicate doesn't invent a behaviour; it gives an existing ritual **structure, receipts, and a scoreboard**.

The emotional engine is the **social contract of the shared acca**: one leg each means your pick carries the whole group's hopes. When it lands, everyone's a hero. When it dies, everyone knows exactly whose leg killed it. No other product owns this moment — bookmakers sell odds, tipsters sell picks, but nobody sells *shared accountability*. That is the thing to communicate.

**One-sentence pitch:**

> The Syndicate turns your group chat's Saturday acca into a proper competition — one leg each, best odds locked, and a leaderboard that settles who's actually good.

---

## 2. Positioning territories

Three candidate territories. Recommendation: **lead with A, prove with B, flavour with C.**

### Territory A — "Every leg counts" (accountability & banter) ⭐ Recommended

The product mechanic *is* the emotion. Your pick, your reputation. The sharpest angle because it is differentiated by design — only a one-leg-each product can say it.

- **Taglines:** "Every leg counts." · "One leg each. No hiding." · "Pull your weight."
- **Tone:** confident, wry, terrace-smart. Speaks *to the group*, not the individual.
- **Risk:** leans competitive; needs warmth elsewhere on the page so it doesn't read as pressure.

### Territory B — "Banter, with receipts" (proof & stats)

The scoreboard angle. Ends the eternal group-chat argument about who's actually good at this. Data-forward; matches the product's charts/leaderboard strength.

- **Taglines:** "Banter, with receipts." · "Who's actually good?" · "The scoreboard your group chat needs."
- **Tone:** dry, evidence-led. Strong for share cards and social.
- **Risk:** stats-led messaging feels cold as the *lead*; better as the proof layer.

### Territory C — "The Saturday ritual" (togetherness)

Warm, cultural, pub-flavoured. Broadest reach, least differentiated — any football social app could claim it.

- **Taglines:** "Football's better together." · "The Saturday ritual, upgraded."
- **Use:** background flavour in the About page and art direction, not the headline.

### Tagline decision (open)

Replace the current descriptor tagline **"Social group accas"** with **"Every leg counts."** as the public-facing tagline. Demote "Social group accas" to the SEO/meta-description role, where it works harder. A tagline should carry feeling; the category descriptor belongs in the subhead.

---

## 3. Homepage (`/`)

### Hero — two options

**Option 1 — evolve current (recommended for the homepage):**

> **Your mates. One acca. Every leg counts.**
>
> Everyone picks one leg. The Syndicate locks in the best odds from UK bookmakers, tracks every result live, and keeps score of who consistently delivers, and who lets the acca down. Free for your whole group.
>
> **[Start a syndicate — free]** *(existing CTA — unchanged)*

**Option 2 — sharper, riskier (recommended as ad/social copy):**

> **Whose leg lost the acca? Now there's proof.**
>
> One pick each. Best odds locked. A leaderboard with a long memory. The Syndicate is where football groups build accas together — and settle the argument for good.
>
> **[Start a syndicate — free]** *(existing CTA — unchanged)*

Option 2 is a stronger *ad*; Option 1 is a stronger *homepage*. Ship 1; test 2 in campaigns.

**Hero visual:** a locked acca card — five legs, five names, combined odds badge, one leg already marked *Won*. The real UI is the best marketing asset; never illustrate what can be screenshotted. This same card is the OG image (resolves the open item in [BRAND.md](./BRAND.md)).

### Page structure (in order)

| # | Section | Notes |
|---|---------|-------|
| 1 | **Hero** | As above. |
| 2 | **How it works** | Keep the current 3 steps; end step 3 on emotion: *"When all legs are in, the acca locks at the best combined odds. Then everyone sweats together."* |
| 3 | **The moment** *(new)* | Full-width, minimal copy over a live-tracking screenshot: *"Three legs in. One to play. Everyone watching the same match."* The differentiator no bookmaker app can claim. |
| 4 | **Value props** | Keep all four; reorder to lead with feeling: Built for friend groups → Track who's actually good → **Best odds, done for you** (retitled — comparison is a chore we remove, not a feature users operate) → You place the bets. |
| 5 | **Who it's for** | Current three audience cards are good. *"Stop arguing about whose pick lost the acca — the stats settle it"* is the best line on the site; promote that energy upward. |
| 6 | **Trust strip** | One plain sentence, always visible before the CTA: *"We're not a bookmaker. We never touch your money — you bet with licensed UK bookmakers, we keep the score. 18+. GambleAware."* |
| 7 | **FAQ** | Keep current four; add a fifth: **"Do we have to bet real money?"** — *"No. Plenty of syndicates play for points and pride alone."* True, widens the funnel, strengthens the RG posture. |
| 8 | **Closing CTA** | *"One leg each. Best odds locked. Bragging rights forever."* **[Get started free]** *(existing CTA — unchanged)* — inclusive of newcomers; avoids "your group already does this" framing. |

---

## 4. About page (`/about`)

Structure as a story, not a feature list — five short sections:

### 4.1 Why this exists

> If your group already builds a Saturday acca, you know the drill: a betslip screenshot in the chat, a spreadsheet nobody updates, and a debate about whose pick let everyone down. We built The Syndicate to give that a proper home. And if you've never built one together, there's no better way to start — one leg each, live odds, and the score kept for you.

First person, human, specific. Speaks to **both** audiences: groups who already build accas together (give the ritual a proper home) and newcomers who've never tried one (the easiest way to start). Avoid "every group does this" framing — it excludes the second audience.

### 4.2 What we are

The coordination layer: picks, locked odds, live results, points, leaderboards. Six leagues plus the World Cup, more coming.

### 4.3 What we're not

The most important section for trust. Plainly: not a bookmaker, never hold money, never place bets, **no tips ever** — *"we keep score; we don't tell you what to pick."* That last line pre-empts the tipster smell that kills credibility in this space.

### 4.4 How the points work

Unit-stake scoring explained in three lines with a worked example (win @ 2.50 → +1.50 pts; loss → −1). Transparency about scoring *is* a trust signal: it says the leaderboard can't be gamed.

### 4.5 Play it safe

Responsible gambling, written warmly rather than legally:

> The Syndicate works just as well for points and pride as it does for money. If you do bet, set a stake the whole group's comfortable with and stick to it. If it stops being fun, stop.

Then GambleAware/GamStop links and 18+.

---

## 5. Design notes (within the locked Turf Green system)

- **Keep the dark theme** — it reads matchday-under-floodlights, distinct from the garish bookmaker aesthetic. Avoid their red/gold/ALL-CAPS urgency vocabulary entirely; visual calm *is* the "not a bookie" message.
- **Product-as-hero:** real UI screenshots with real-looking group names ("Dog & Duck FC", "Marketing Team Accas") — never stock photos of lads cheering.
- **Motion (one, only one):** the Acca stack logo's three bars stacking in as legs are submitted — logo, product mechanic, and loading state in a single gesture.
- **Outfit for feelings, Geist for facts:** display font on emotional headlines; the moment odds, points, or tables appear, switch to Geist. The typographic contrast reinforces "banter + receipts".
- **Ship the favicon/OG image** from the Acca stack mark before any promotion — link previews in WhatsApp *are* the primary ad unit for this audience.

---

## 6. Voice rules & guardrails

**Always**

- Speak to the group ("your syndicate"), not the individual.
- Name the ritual: Saturday, the group chat, the pub.
- Keep scores and odds precise.

**Never**

- "Guaranteed", "risk-free", "easy money", "smart bets", win-rate promises, or anything a tipster would say.
- Urgency mechanics ("odds boost ends soon!").

**Compliance floor on every marketing page**

- 18+ statement.
- GambleAware link.
- "Bet with licensed UK bookmakers" phrasing.
- Trust strip before any CTA.

---

## 7. Next steps

1. [ ] Decide the tagline swap ("Social group accas" → "Every leg counts."). **Note:** the tagline renders as the hero eyebrow directly above the headline, which already ends in "Every leg counts." — swapping as-is would read twice in a row. Options: keep the eyebrow as the category descriptor (current), or swap and drop the eyebrow.
2. [x] Copy shipped (July 2026): hero subhead, value prop reorder + "Best odds, done for you" retitle, how-it-works step 3, fifth FAQ, closing CTA line + trust line on `/`, "Why this exists" rewrite on `/about`, store listing aligned (`apps/mobile/STORE_LISTING.md`).
3. [ ] Produce OG image + favicon from the locked-acca card / Acca stack mark.
4. [ ] Add "The moment" section to `/` (needs a live-tracking product screenshot).
