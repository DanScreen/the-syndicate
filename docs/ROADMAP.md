# Roadmap

Production: [www.the-syndicate.uk](https://www.the-syndicate.uk) · **Index:** [README.md](./README.md)

---

## Success metric

10 users complete: sign up → group → submit leg → acca locks → settle → leaderboard.

**Current focus:** validate with real users before adding more features.

---

## Done (July 2026)

Core loop and MVP polish are **shipped**:

- Auth, groups, invite links, rounds (collecting → locked → settled)
- Live odds (The Odds API) + mock fallback; extended markets (BTTS, double chance, DNB)
- Per-leg **competition picker** (EPL, Championship, L1, L2, World Cup)
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
| 2 | **FA Cup + EFL Cup** | Code | Phase 1b — `packages/shared/src/competitions.ts` |
| 3 | **GCP cost reduction** | Ops/infra | Cloud SQL ~90% of spend; see [DEPLOYMENT.md](./DEPLOYMENT.md#cost-optimization) |
| 4 | **Public platform leaderboards** | Code | Admin version shipped; open to all users when ready |
| 5 | User profile page | Code | Optional; `/performance` covers cross-group stats today |
| 6 | football-data.org tier upgrade | Ops | L1/L2 sync returns 403 on free tier |
| 7 | Mobile app catch-up | Code | Paused — needs `?competition=` API |
| 8 | Terraform CI GCS permissions fix | Infra | App deploy unaffected |

---

## Post-MVP

Push notifications, chat/feed, stake pooling, social sign-in, more sports.

---

## Paused

- **Mobile** (`apps/mobile/`) — resume when web validated with real users

---

## Operator notes

**Secrets (GitHub):** `ODDS_API_KEY`, `FOOTBALL_DATA_API_KEY`, `DATABASE_URL`, `AUTH_SECRET`, `CRON_SECRET`, `RESEND_API_KEY` (optional), GCP deploy secrets.

**Variables (GitHub):** `EMAIL_FROM` (optional), `ADMIN_EMAILS` (optional, comma-separated developer emails).

**Local odds:** `ODDS_API_KEY` in `apps/web/.env.local` — omit for mock fixtures.

**Infra defaults:** Cloud SQL `db-f1-micro`, zonal, Cloud Run `min_instances = 0` — see [DEPLOYMENT.md](./DEPLOYMENT.md#cost-optimization).

After shipping: update [CURRENT_STATE.md](./CURRENT_STATE.md) and check off spec phases.
