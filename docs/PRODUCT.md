# The Syndicate — Product

**Pitch:** Social groups where each member adds one leg to a shared football acca, track performance together, compete on picks.

**Brand & marketing:** [BRAND.md](./BRAND.md) · Public pages: `/`, `/about`

**As-built detail:** [CURRENT_STATE.md](./CURRENT_STATE.md) · **Planned features:** [specs/](./specs/) · **Next work:** [ROADMAP.md](./ROADMAP.md)

---

## Target users

- Recreational football bettors, friend groups, pub syndicates
- Future: other sports (update this doc first)

---

## Core flows

### 1. Onboarding
Sign up → **Groups** home (`/dashboard`) listing syndicates. Cross-group stats on **Performance** (`/performance`).

### 2. Create / join group
Owner creates group (name, max members) → invite code + link. Members join via code or `/groups/join?code=`.

### 3. Build the acca
1. Owner starts a round (group **Round** tab)
2. Each member picks a **competition**, fixture, market, selection (4-step form)
3. **Best odds only** shown per selection
4. All legs in → acca **locks** with best combined bookmaker
5. Members receive **email notification** when acca locks (if Resend configured)

→ [specs/competitions-and-results.md](./specs/competitions-and-results.md)

### 4. Place & track
Locked round: **Picks** list first, then combined odds + primary betslip CTA. **Compare bookmakers** is collapsible below. Track until fixtures finish.

### 5. Settle & stats
Match sync cron auto-settles locked rounds when all fixtures finish. Email on settle. **Leaderboard** tab for points; **Performance** tab for group charts and member breakdowns. User-level **Performance** nav for cross-group stats.

**Primary metric:** unit-stake **points** (not £ profit). Users can enter a stake on performance pages to see profit equivalent (points × stake).

→ [specs/group-stats-and-points.md](./specs/group-stats-and-points.md)

### 6. Admin (developers only)
Platform admins (`ADMIN_EMAILS`) access `/admin` for product metrics and platform-wide leaderboards (syndicate + player rankings). Not visible to regular users yet.

→ [specs/platform-admin.md](./specs/platform-admin.md)

---

## MVP checklist

### Shipped
- [x] Auth, groups, invite flow
- [x] Live odds (The Odds API) + extended markets
- [x] Per-leg competition picker (5 leagues + World Cup)
- [x] Leg submit, acca lock, acca bookmaker rankings
- [x] Real bookmaker betslip deeplinks
- [x] Match table + football-data.org sync
- [x] Hands-off auto-settle + owner-triggered auto-settle
- [x] Email notifications (round locked / settled)
- [x] Unit-stake points + leaderboard
- [x] Group stats + member stats (charts, favourites)
- [x] Cross-group Performance page + share cards
- [x] Split layout: Groups home, group tabs (Round / Leaderboard / Performance)
- [x] Marketing homepage + about page (Turf Green brand)
- [x] Platform admin dashboard + leaderboards (admin-only)
- [x] Points-first stats with stake → profit converter

### Backlog
- [ ] Public platform leaderboards (admin version exists)
- [ ] Dedicated user profile page (optional — `/performance` covers stats today)
- [ ] FA Cup + EFL Cup competitions

Full priority list: [ROADMAP.md](./ROADMAP.md)

---

## Non-goals

- Real money processing or bet placement via API
- Licensed bookmaker operations
- In-play betting
- Android app (Expo scaffold exists, paused)

---

## Success metric

**10 users** complete: sign up → group → submit leg → acca locks → settle → view leaderboard.
