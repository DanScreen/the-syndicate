# Roadmap

Production: [www.tikiacca.com](https://www.tikiacca.com) · **Index:** [README.md](./README.md)

---

## Success metric

10 users complete: sign up → group → submit leg → acca locks → settle → leaderboard.

**Current focus:** validate with real users before adding more features.

---

## Done (July 2026)

Core loop and MVP polish are **shipped**:

- Auth, groups, invite links, rounds (open → locked → settled)
- Live odds (The Odds API) + mock fallback; extended markets (BTTS, double chance, DNB)
- Per-leg **competition picker** (EPL, Championship, La Liga, Ligue 1, Serie A, Bundesliga, World Cup)
- **Acca lock** with best combined bookmaker + ranked bookmaker list at lock
- **Real bookmaker betslip deeplinks** (Odds API `includeLinks`; hubs labelled last-resort; per-leg Open at recommended book)
- **Match table** + football-data.org sync cron + hands-off auto-settle
- **Email + push notifications** — lock, settle, pick reminders (T−2h); preferences UI — [specs/notifications.md](./specs/notifications.md)
- **Unit-stake points** (win: `odds−1`, loss: `−1`, void: `0`)
- **Group stats** + **member stats** (charts, favourites, best/worst)
- **Cross-group performance** page (`/performance`) + share cards
- **Split app layout** — Groups home, Performance nav, group tabs (Round / Leaderboard / Performance)
- Locked round UX: in-progress leg results, locked odds only (no bookmaker comparison after lock)
- **Early settle on first lost leg** — group −1 immediately; remaining legs resolve afterward
- **Auto-settle reliability** — 5-min match sync, cache bypass on cron, progressive leg outcomes before acca settles
- **Brand & marketing** — Turf Green + Triangle rondo logo (favicon `?v=` cache-bust), homepage, `/about`, `/blog`
- **Signed-in public pages** — logo + Home → `/`; tagline always shown; Blog rightmost when signed in; session-aware header on static `/blog`
- **Platform admin** — overview, leaderboards, `ADMIN_EMAILS`, analytics events
- **Points-first UX** — stake → profit converter; see [specs/platform-admin.md](./specs/platform-admin.md)
- Deploy: Cloud Run + Cloud SQL + GitHub Actions; Cloud Scheduler match sync (every 5 min UTC)
- **Multi-leg accas** — owner sets 1 / 2 / 3 legs per member; web + mobile — [specs/multi-leg-accas.md](./specs/multi-leg-accas.md)
- **Account page** — greeting → `/account` (notifications + sign out); Notifications removed from app nav
- **Group chat & reactions** — round-scoped web/mobile threads, lifecycle messages, pick-mirrored reactions, unread badges, batched push — [spec](./specs/group-chat.md)

---

## Next — backlog

| # | Feature | Type | Notes |
|---|---------|------|-------|
| 1 | **Validate with real users** | Product | Run 2–3 friend groups through full loop on prod |
| 2 | **Season readiness (2026–27)** | Mostly ops | Leagues can be enabled via `/admin/competitions` when ready; remaining code: cups + quiet-period empty states — [specs/season-readiness.md](./specs/season-readiness.md) (absorbs old "FA Cup + EFL Cup" item) |
| 3 | **Live matchday** | Code | Per-leg result push + acca-won push + live round view — [specs/live-matchday.md](./specs/live-matchday.md) |
| 4 | **Settle-day recap share card** | Code | Auto recap image per settled round; invite loop — [specs/settle-recap-share.md](./specs/settle-recap-share.md) |
| 5 | **Affiliate links** | Code + ops | Bookmaker affiliate programmes (start applications early — approval takes weeks) — [specs/affiliate-and-betslips.md](./specs/affiliate-and-betslips.md) Phase A |
| 6 | **Better betslip deeplinks** | Code | Remaining: acca-builder patterns + link-quality audit — [specs/affiliate-and-betslips.md](./specs/affiliate-and-betslips.md) Phase B (hubs/per-leg/CTA honesty shipped) |
| 7 | **Seasons + public leaderboards** | Code | Season windows, `/leaderboards`, monthly awards — [specs/seasons-and-public-leaderboards.md](./specs/seasons-and-public-leaderboards.md) (supersedes old "public platform leaderboards" item) |
| 8 | **Streaks & badges** | Code | Light gamification; needs chat for thread moments — [specs/streaks-and-badges.md](./specs/streaks-and-badges.md) |
| 9 | **GCP cost reduction** | Ops/infra | Cloud SQL ~90% of spend; see [DEPLOYMENT.md](./DEPLOYMENT.md#cost-optimization) |
| 10 | **Mobile — friend testing → stores** | Product | You: [DEVELOPER_TESTING.md](../apps/mobile/DEVELOPER_TESTING.md); mates: APK / TestFlight. Store distribution unblocks the invite loop — prioritise fees once validated |
| 11 | **Expo push setup** | Mobile ops | See checklist below — required for mobile push (prereq for chat + live matchday push) |
| 12 | Terraform CI GCS permissions fix | Infra | App deploy unaffected |

---

## Deferred (no current plan)

| Item | Notes |
|------|-------|
| **Paid subscriptions** | Core group loop stays free; revisit only if a clear paid value prop emerges (e.g. organiser tools with proven demand) |

---

## Post-MVP

Group-vs-group challenges (needs user density), copy-a-pick between your own groups, stake pooling, social sign-in, more sports, end-of-season "wrapped" recap ([specs/seasons-and-public-leaderboards.md](./specs/seasons-and-public-leaderboards.md) Phase 3), light responsible-gambling tooling (e.g. monthly stake reality check — points-first branding is a deliberate differentiator). Multi-leg admin ceilings — [specs/multi-leg-accas.md](./specs/multi-leg-accas.md). Notification Phase 3 is now specced as [specs/live-matchday.md](./specs/live-matchday.md); chat/feed as [specs/group-chat.md](./specs/group-chat.md).

---

## Mobile apps

Native **iPhone** and **Android** apps via Expo (`apps/mobile/`), targeting **functional parity** with the member-facing website.

**Status:** EAS project linked at `@the-syndicate/tiki-acca`; developer native testing (Expo Go / device build). Friend distribution: Android APK; iPhone TestFlight after store fees.

**Next:** You validate on device ([DEVELOPER_TESTING.md](../apps/mobile/DEVELOPER_TESTING.md)), then 2–3 friend groups ([FRIEND_TESTING.md](../apps/mobile/FRIEND_TESTING.md)).

**Expo push — operator checklist:**

- [x] `eas login` + `eas init` in `apps/mobile`
- [x] Set `EAS_PROJECT_ID` in `apps/mobile/.env` (with committed fallback in `app.config.ts`)
- [ ] Enable push on a **physical device** via Notifications screen in the app
- [ ] EAS production build with APNs (iOS) + FCM (Android) credentials for reliable prod push
- [ ] Test pick reminder + lock/settle push on device

**Spec:** [specs/mobile-apps.md](./specs/mobile-apps.md) — includes [distribution strategy](./specs/mobile-apps.md#distribution-strategy).

---

## Paused

- *(none)*

---

## Operator notes

**Variables (GitHub):** `EMAIL_FROM` (optional).

**Secrets (GitHub):** `ODDS_API_KEY`, `FOOTBALL_DATA_API_KEY`, `DATABASE_URL`, `AUTH_SECRET`, `CRON_SECRET` (optional — seed Terraform / Secret Manager), `RESEND_API_KEY` (optional), `ADMIN_EMAILS` (optional, comma-separated developer emails), `EXPO_TOKEN` (optional — mobile EAS CI), GCP deploy secrets.

**Local odds:** `ODDS_API_KEY` in `apps/web/.env.local` — omit for mock fixtures.

**Infra defaults:** Cloud SQL `db-f1-micro`, zonal, Cloud Run `min_instances = 0` — see [DEPLOYMENT.md](./DEPLOYMENT.md#cost-optimization).

After shipping: update [CURRENT_STATE.md](./CURRENT_STATE.md) and check off spec phases.
