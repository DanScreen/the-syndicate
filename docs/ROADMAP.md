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

---

## Next — backlog

| # | Feature | Type | Notes |
|---|---------|------|-------|
| 1 | **Validate with real users** | Product | Run 2–3 friend groups through full loop on prod |
| 2 | **Affiliate links** | Code + ops | Bookmaker affiliate programmes — [specs/affiliate-and-betslips.md](./specs/affiliate-and-betslips.md) Phase A |
| 3 | **Better betslip deeplinks** | Code | Remaining: acca-builder patterns + link-quality audit — [specs/affiliate-and-betslips.md](./specs/affiliate-and-betslips.md) Phase B (hubs/per-leg/CTA honesty shipped) |
| 4 | **FA Cup + EFL Cup** | Code | Phase 1b — `packages/shared/src/competitions.ts` |
| 5 | **GCP cost reduction** | Ops/infra | Cloud SQL ~90% of spend; see [DEPLOYMENT.md](./DEPLOYMENT.md#cost-optimization) |
| 6 | **Public platform leaderboards** | Code | Admin version shipped; open to all users when ready |
| 7 | User profile page | Code | Optional; `/performance` covers cross-group stats today |
| 8 | **Mobile — friend testing** | Product | You: [DEVELOPER_TESTING.md](../apps/mobile/DEVELOPER_TESTING.md); mates: APK / later TestFlight |
| 9 | **Expo push setup** | Mobile ops | See checklist below — required for mobile push notifications |
| 10 | Terraform CI GCS permissions fix | Infra | App deploy unaffected |

---

## Deferred (no current plan)

| Item | Notes |
|------|-------|
| **Paid subscriptions** | Core group loop stays free; revisit only if a clear paid value prop emerges (e.g. organiser tools with proven demand) |
| **Multi-leg accas** | Opt-in group setting: owner picks **1 / 2 / 3 legs per player** (symmetric — everyone same quota). Default stays 1. Build after user validation — [specs/multi-leg-accas.md](./specs/multi-leg-accas.md) |

---

## Post-MVP

Chat/feed, stake pooling, social sign-in, more sports. Multi-leg accas — [specs/multi-leg-accas.md](./specs/multi-leg-accas.md). Notification Phase 3 (per-leg results, quiet hours) — [specs/notifications.md](./specs/notifications.md).

---

## Mobile apps

Native **iPhone** and **Android** apps via Expo (`apps/mobile/`), targeting **functional parity** with the member-facing website.

**Status:** Developer native testing (Expo Go / device build). Friend distribution: Android APK; iPhone TestFlight after store fees.

**Next:** You validate on device ([DEVELOPER_TESTING.md](../apps/mobile/DEVELOPER_TESTING.md)), then 2–3 friend groups ([FRIEND_TESTING.md](../apps/mobile/FRIEND_TESTING.md)).

**Expo push — operator checklist:**

- [ ] `eas login` + `eas init` in `apps/mobile`
- [ ] Set `EAS_PROJECT_ID` in `apps/mobile/.env` (from `eas init` output)
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
