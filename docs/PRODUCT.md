# Tiki Acca — Product

**Pitch:** Social groups where each member adds one leg to a shared football acca, track performance together, compete on picks.

**Brand & marketing:** [BRAND.md](./BRAND.md) · Public pages: `/`, `/about`, `/blog` (reachable when signed in; logo + Home → `/`; tagline always shown)

**As-built detail:** [CURRENT_STATE.md](./CURRENT_STATE.md) · **Planned features:** [specs/](./specs/) · **Next work:** [ROADMAP.md](./ROADMAP.md)

---

## Target users

- Recreational football bettors, friend groups, pub groups
- Future: other sports (update this doc first)

---

## Core flows

### 1. Onboarding
Sign up (first + last name) → **Groups** home (`/dashboard`) listing groups. Cross-group stats on **Performance** (`/performance`). Header greets with first name only — tap **Hi, {name}** for **Account** (`/account`: notifications + sign out).

### 2. Create / join group
Owner creates group (name only) → invite code + link. Anyone with the link opens `/groups/join?code=`. If signed out, the page prompts **Sign in** or **Sign up** (invite preserved via `callbackUrl`); after auth they return and join.

### 3. Build the acca
1. Each group has an always-open round on the **Round** tab — no manual start step
2. Group owner sets **legs per member** (1, 2, or 3 — default 1) when creating the group or in **Settings**; changing it updates the **open** round immediately (locked / in-progress bets keep their quota)
3. Each member picks a **competition**, fixture, market, selection (4-step form) for each of their legs. Selecting a market collapses the long market catalogue and immediately reveals that market's outcomes; **Change market** returns to the catalogue.
4. **Best odds only** shown per selection
   - A round allows only **one leg per fixture**. Same-match combinations need bookmaker bet-builder prices adjusted for correlation, which the current odds feed does not provide.
5. Everyone fills their quota **or the first submitted leg kicks off** → acca **locks** with best combined bookmaker (members under quota miss or enter partial)
6. Members receive **email notification** when acca locks (if Resend configured)
7. When a round settles, the next open round starts automatically (using the group's current legs-per-member setting)
8. Each round has a web/mobile **Group Chat** thread. Pick submissions, changes, removals, lock, results, and settlement appear as system messages; members can post text (profanity-filtered) and react using the quiet **React** control. Pick rows mirror reactions from their latest announcement.

→ [specs/competitions-and-results.md](./specs/competitions-and-results.md)

### 4. Place & track
While the bet is open: leg picker shows **best odds only** per selection; **Compare bookmakers** shows a provisional ranking from legs submitted so far. Once locked: **frozen combined odds** and the **Compare bookmakers** ranking captured at lock, so members can see which bookmaker gives the best acca odds when they place the bet. Per-leg **Won / Lost / Awaiting** badges update as matches finish. Betslip links shown until the first result; then tracking only. Page auto-refreshes every 60s while locked.

**Editing picks:** members can change their own leg — in open rounds and in locked rounds — until the **first kickoff** among the acca's legs. Editing a locked round reprices the whole acca at current odds. Once the first match starts, picks are final.

**Removing picks:** members can remove only their own leg while the round is still **open** and before the first kickoff. Removal requires confirmation and is announced in Group Chat. Locked and settled accas cannot lose legs.

### 5. Settle & stats
**Settlement is system-only** — the match sync cron (every 5 min) updates leg outcomes as matches finish. A round **settles as soon as any leg loses** (group −1, next open round starts) or when every leg is won/void (acca win). Unfinished legs on a busted acca keep resolving afterward for personal outcomes/points. Group owners cannot mark outcomes themselves. Platform admins have a web-only **settlement queue** (`/admin/settlement`) for stuck/overdue legs (including remaining legs after an early loss). Email on settle. **Leaderboard** tab for points; **History** tab for every settled acca (fixtures, markets, outcomes); **Performance** tab for group charts and member breakdowns. User-level **Performance** nav for cross-group stats. Round tab shows a short recent-settled teaser with a link to full history.

**Primary metric:** unit-stake **points** (not £ profit). Users can enter a stake on performance pages to see profit equivalent (points × stake).

→ [specs/group-stats-and-points.md](./specs/group-stats-and-points.md)

### 6. Admin (developers only)
Platform admins (`ADMIN_EMAILS`) see an **Admin** tab in the header with `/admin` (product metrics) and platform-wide leaderboards. Role refreshes from DB on each session — no re-login needed after adding an email.

→ [specs/platform-admin.md](./specs/platform-admin.md)

---

## MVP checklist

### Shipped
- [x] Auth, groups, invite flow
- [x] Multi-leg accas — owner sets 1 / 2 / 3 legs per member (web + mobile)
- [x] Live odds (The Odds API) + extended markets
- [x] Per-leg competition picker (EPL, Championship, top European leagues, World Cup)
- [x] One leg per fixture per round (avoids inaccurate same-match bet-builder multiplication)
- [x] Leg submit, acca lock, acca bookmaker rankings
- [x] Real bookmaker betslip deeplinks
- [x] Match table + football-data.org sync
- [x] Hands-off auto-settle (system-only; owner settlement removed July 2026; early settle on first loss)
- [x] Editable picks until first kickoff (open + locked rounds; locked edits reprice the acca; web + mobile)
- [x] Remove own picks while a round is open (confirmation + Group Chat event; web + mobile)
- [x] Admin settlement queue with overdue-leg flags (web-only)
- [x] Blog (`/blog`, file-based MDX) + sitemap/robots; session-aware marketing header on static pages
- [x] Public nav: Home / About always reachable when signed in; Blog rightmost in app nav
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
- [x] Group chat, lifecycle messages, reactions, unread badges, and batched chat push (web + mobile)

### Backlog
- [ ] Season readiness — World Cup → 2026–27 leagues + FA Cup/EFL Cup — [specs/season-readiness.md](./specs/season-readiness.md)
- [ ] Live matchday (per-leg push + live round view) — [specs/live-matchday.md](./specs/live-matchday.md)
- [ ] Settle-day recap share card — [specs/settle-recap-share.md](./specs/settle-recap-share.md)
- [ ] Affiliate links + improved betslip deeplinks — [specs/affiliate-and-betslips.md](./specs/affiliate-and-betslips.md)
- [ ] Seasons + public leaderboards + monthly awards — [specs/seasons-and-public-leaderboards.md](./specs/seasons-and-public-leaderboards.md)
- [ ] Streaks & badges — [specs/streaks-and-badges.md](./specs/streaks-and-badges.md) competitions

**Deferred:** paid subscriptions — no current plan; core loop stays free.

Full priority list: [ROADMAP.md](./ROADMAP.md)

---

## Mobile apps

Native **iPhone** and **Android** apps (`apps/mobile/`) match member-facing web. The initial sign-in screen doubles as a compact, non-scrolling brand landing screen using the shared Tiki Acca headline and tagline. **Developer testing** uses Expo Go or a device build (no store fee). **Friend distribution:** Android APK now; iPhone TestFlight after validation.

Full strategy: [specs/mobile-apps.md](./specs/mobile-apps.md) · [DEVELOPER_TESTING.md](../apps/mobile/DEVELOPER_TESTING.md) · [FRIEND_TESTING.md](../apps/mobile/FRIEND_TESTING.md)

---

## Non-goals

- Real money processing or bet placement via API
- Licensed bookmaker operations
- In-play betting

---

## Success metric

**10 users** complete: sign up → group → submit leg → acca locks → settle → view leaderboard.
