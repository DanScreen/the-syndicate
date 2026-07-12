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
Owner creates group (name only) → invite code + link. Anyone with the link can join via code or `/groups/join?code=`.

### 3. Build the acca
1. Each syndicate has an always-open round on the **Round** tab — no manual start step
2. Each member picks a **competition**, fixture, market, selection (4-step form)
3. **Best odds only** shown per selection
4. All legs in → acca **locks** with best combined bookmaker
5. Members receive **email notification** when acca locks (if Resend configured)
6. When a round settles, the next open round starts automatically

→ [specs/competitions-and-results.md](./specs/competitions-and-results.md)

### 4. Place & track
While the bet is open: leg picker shows **best odds only** per selection. Once locked: **frozen odds** per leg and combined acca odds — no live bookmaker comparison. Per-leg **Won / Lost / Awaiting** badges update as matches finish (acca may still be open). Betslip links shown until the first result; then tracking only. Page auto-refreshes every 60s while locked.

### 5. Settle & stats
Match sync cron (every 5 min) auto-settles locked rounds when all fixtures finish. Individual leg outcomes persist before the full acca settles. Email on settle. **Leaderboard** tab for points; **Performance** tab for group charts and member breakdowns. User-level **Performance** nav for cross-group stats. **Recent rounds** show locked odds per leg.

**Primary metric:** unit-stake **points** (not £ profit). Users can enter a stake on performance pages to see profit equivalent (points × stake).

→ [specs/group-stats-and-points.md](./specs/group-stats-and-points.md)

### 6. Admin (developers only)
Platform admins (`ADMIN_EMAILS`) see an **Admin** tab in the header with `/admin` (product metrics) and platform-wide leaderboards. Role refreshes from DB on each session — no re-login needed after adding an email.

→ [specs/platform-admin.md](./specs/platform-admin.md)

---

## MVP checklist

### Shipped
- [x] Auth, groups, invite flow
- [x] Live odds (The Odds API) + extended markets
- [x] Per-leg competition picker (EPL, Championship, top European leagues, World Cup)
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
- [x] Locked round UX: in-progress leg results, locked odds only
- [x] Progressive auto-settle (leg outcomes before full acca settles)
- [x] 5-minute match sync cron

### Backlog
- [ ] Affiliate links + improved betslip deeplinks — [specs/affiliate-and-betslips.md](./specs/affiliate-and-betslips.md)
- [ ] Public platform leaderboards (admin version exists)
- [ ] Dedicated user profile page (optional — `/performance` covers stats today)
- [ ] FA Cup + EFL Cup competitions

**Deferred:** paid subscriptions — no current plan; core loop stays free.

Full priority list: [ROADMAP.md](./ROADMAP.md)

---

## Mobile apps

Native **iPhone** and **Android** apps (`apps/mobile/`) match member-facing web. **Developer testing** uses Expo Go or a device build (no store fee). **Friend distribution:** Android APK now; iPhone TestFlight after validation.

Full strategy: [specs/mobile-apps.md](./specs/mobile-apps.md) · [DEVELOPER_TESTING.md](../apps/mobile/DEVELOPER_TESTING.md) · [FRIEND_TESTING.md](../apps/mobile/FRIEND_TESTING.md)

---

## Non-goals

- Real money processing or bet placement via API
- Licensed bookmaker operations
- In-play betting

---

## Success metric

**10 users** complete: sign up → group → submit leg → acca locks → settle → view leaderboard.
