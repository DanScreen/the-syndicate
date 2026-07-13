# Roadmap

Production: [www.the-syndicate.uk](https://www.the-syndicate.uk) · **Index:** [README.md](./README.md)

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
- **Real bookmaker betslip deeplinks** (The Odds API `includeLinks`)
- **Match table** + football-data.org sync cron + hands-off auto-settle
- **Email notifications** — round locked / settled (Resend; optional)
- **Unit-stake points** (win: `odds−1`, loss: `−1`, void: `0`)
- **Group stats** + **member stats** (charts, favourites, best/worst)
- **Cross-group performance** page (`/performance`) + share cards
- **Split app layout** — Groups home, Performance nav, group tabs (Round / Leaderboard / Performance)
- Locked round UX: in-progress leg results, locked odds only (no bookmaker comparison after lock)
- **Auto-settle reliability** — 5-min match sync, cache bypass on cron, progressive leg outcomes before acca settles
- **Brand & marketing** — Turf Green + Acca stack logo, homepage, `/about`
- **Platform admin** — overview, leaderboards, `ADMIN_EMAILS`, analytics events
- **Points-first UX** — stake → profit converter; see [specs/platform-admin.md](./specs/platform-admin.md)
- Deploy: Cloud Run + Cloud SQL + GitHub Actions; Cloud Scheduler match sync (every 5 min UTC)

---

## Next — backlog

| # | Feature | Type | Notes |
|---|---------|------|-------|
| 1 | **Validate with real users** | Product | Run 2–3 friend groups through full loop on prod |
| 2 | **Pick reminders** | Code + ops | Email members without a leg before kickoff deadline — [specs/round-deadline-lock.md](./specs/round-deadline-lock.md) Phase 2 |
| 3 | **Affiliate links** | Code + ops | Bookmaker affiliate programmes, tracked outbound deeplinks, disclosure UI — [specs/affiliate-and-betslips.md](./specs/affiliate-and-betslips.md) Phase A |
| 4 | **Better betslip deeplinks** | Code | Acca-builder URLs, fewer hub fallbacks, per-leg link quality — [specs/affiliate-and-betslips.md](./specs/affiliate-and-betslips.md) Phase B |
| 5 | **FA Cup + EFL Cup** | Code | Phase 1b — `packages/shared/src/competitions.ts` |
| 6 | **GCP cost reduction** | Ops/infra | Cloud SQL ~90% of spend; see [DEPLOYMENT.md](./DEPLOYMENT.md#cost-optimization) |
| 7 | **Public platform leaderboards** | Code | Admin version shipped; open to all users when ready |
| 8 | User profile page | Code | Optional; `/performance` covers cross-group stats today |
| 9 | **Mobile — friend testing** | Product | You: [DEVELOPER_TESTING.md](../apps/mobile/DEVELOPER_TESTING.md); mates: APK / later TestFlight |
| 10 | Terraform CI GCS permissions fix | Infra | App deploy unaffected |

---

## Deferred (no current plan)

| Item | Notes |
|------|-------|
| **Paid subscriptions** | Core syndicate loop stays free; revisit only if a clear paid value prop emerges (e.g. organiser tools with proven demand) |
| **Multi-leg accas** | Opt-in group setting: owner picks **1 / 2 / 3 legs per player** (symmetric — everyone same quota). Default stays 1. Build after user validation — [specs/multi-leg-accas.md](./specs/multi-leg-accas.md) |

---

## Post-MVP

Push notifications, chat/feed, stake pooling, social sign-in, more sports. Multi-leg accas (owner: 1–3 legs per player, symmetric) — see [specs/multi-leg-accas.md](./specs/multi-leg-accas.md).

---

## Mobile apps

Native **iPhone** and **Android** apps via Expo (`apps/mobile/`), targeting **functional parity** with the member-facing website.

**Status:** Developer native testing (Expo Go / device build). Friend distribution: Android APK; iPhone TestFlight after store fees.

**Next:** You validate on device ([DEVELOPER_TESTING.md](../apps/mobile/DEVELOPER_TESTING.md)), then 2–3 friend groups ([FRIEND_TESTING.md](../apps/mobile/FRIEND_TESTING.md)).

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
