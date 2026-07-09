# The Syndicate — Product

**Pitch:** Social groups where each member adds one leg to a shared football acca, track performance together, compete on picks.

**As-built detail:** [CURRENT_STATE.md](./CURRENT_STATE.md) · **Planned features:** [specs/](./specs/)

---

## Target users

- Recreational football bettors, friend groups, pub syndicates
- Future: other sports (update this doc first)

---

## Core flows

### 1. Onboarding
Sign up → dashboard with groups and stats.

### 2. Create / join group
Owner creates group (name, max members) → invite code + link. Members join via code or `/groups/join?code=`.

### 3. Build the acca
1. Owner starts a round  
2. Each member picks a **competition** *(planned)*, fixture, market, selection  
3. **Best odds only** shown per selection *(live today)*  
4. All legs in → acca **locks** with best combined bookmaker *(live today)*  

→ [specs/competitions-and-results.md](./specs/competitions-and-results.md)

### 4. Place & track
Locked acca shows combined odds, recommended bookmaker, betslip link. Track until fixtures finish.

### 5. Settle & stats
Resolve legs (manual or auto). Points + leaderboard. **Group stats & charts** *(planned)*.

→ [specs/group-stats-and-points.md](./specs/group-stats-and-points.md)

---

## MVP checklist

### Shipped
- [x] Auth, groups, invite flow
- [x] Live odds (The Odds API) + extended markets
- [x] Leg submit, acca lock, acca bookmaker comparison
- [x] Manual + auto settle (football-data.org)
- [x] Leaderboard, round history, landing/SEO

### Planned (see specs)
- [ ] Per-leg competition picker
- [ ] Shared match results table
- [ ] Unit-stake points + group/member stats

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
