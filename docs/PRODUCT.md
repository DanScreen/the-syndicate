# The Syndicate — Product

**Pitch:** Social groups where each member adds one leg to a shared football acca, track performance together, compete on picks.

**As-built detail:** [CURRENT_STATE.md](./CURRENT_STATE.md) · **Planned features:** [specs/](./specs/) · **Next work:** [ROADMAP.md](./ROADMAP.md)

---

## Target users

- Recreational football bettors, friend groups, pub syndicates
- Future: other sports (update this doc first)

---

## Core flows

### 1. Onboarding
Sign up → dashboard with cross-group stats summary.

### 2. Create / join group
Owner creates group (name, max members) → invite code + link. Members join via code or `/groups/join?code=`.

### 3. Build the acca
1. Owner starts a round
2. Each member picks a **competition**, fixture, market, selection (4-step form)
3. **Best odds only** shown per selection
4. All legs in → acca **locks** with best combined bookmaker + ranked bookmaker list
5. Members receive **email notification** when acca locks (if Resend configured)

→ [specs/competitions-and-results.md](./specs/competitions-and-results.md)

### 4. Place & track
Locked acca shows combined odds, recommended bookmaker, ranked alternatives ("Where to place"), betslip link. Track until fixtures finish.

### 5. Settle & stats
Match sync cron auto-settles locked rounds when all fixtures finish. Email on settle. Unit-stake points + leaderboard. **Group stats** and **member stats** on group page. **Dashboard** shows cross-group performance + share cards.

→ [specs/group-stats-and-points.md](./specs/group-stats-and-points.md)

---

## MVP checklist

### Shipped
- [x] Auth, groups, invite flow
- [x] Live odds (The Odds API) + extended markets
- [x] Per-leg competition picker (5 leagues + World Cup)
- [x] Leg submit, acca lock, acca bookmaker rankings
- [x] Match table + football-data.org sync
- [x] Hands-off auto-settle + owner-triggered auto-settle
- [x] Email notifications (round locked / settled)
- [x] Unit-stake points + leaderboard
- [x] Group stats + member stats (charts, favourites)
- [x] Dashboard cross-group summary + share cards

### Backlog
- [ ] Real bookmaker betslip deeplinks
- [ ] Dedicated user profile page

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
