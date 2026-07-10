# Roadmap

Production: [www.the-syndicate.uk](https://www.the-syndicate.uk) · **Index:** [README.md](./README.md)

---

## Success metric

10 users complete: sign up → group → submit leg → acca locks → settle → leaderboard.

---

## Done (July 2026)

Core loop is **shipped**:

- Auth, groups, invite links, rounds (collecting → locked → settled)
- Live odds (The Odds API) + mock fallback; extended markets (BTTS, double chance, DNB)
- Per-leg **competition picker** (EPL, Championship, L1, L2, World Cup)
- **Acca lock** with best combined bookmaker + **ranked bookmaker list** at lock
- **Match table** + football-data.org sync cron + auto-settle from DB
- **Hands-off auto-settle** — cron sync settles locked rounds when all matches finished
- **Email notifications** — round locked / round settled (Resend; optional)
- **Unit-stake points** (win: `odds−1`, loss: `−1`, void: `0`)
- **Group stats** (summary, cumulative chart, multi-member chart)
- **Member stats** (breakdown, favourites, best/worst picks)
- **Dashboard cross-group summary** + share cards
- Leaderboard, round history, landing/SEO
- Deploy: Cloud Run + Cloud SQL + GitHub Actions; Cloud Scheduler for match sync

---

## Next — backlog

| # | Feature | Notes |
|---|---------|-------|
| 1 | Real bookmaker betslip deeplinks | Beyond generic links today |
| 2 | User profile page | Cross-group stats in dedicated view |
| 3 | football-data.org tier upgrade | L1/L2 sync returns 403 on free tier |
| 4 | FA Cup + EFL Cup | Phase 1b in competitions spec |
| 5 | Mobile app catch-up | `apps/mobile/` needs `?competition=` API |
| 6 | Terraform CI GCS permissions fix | App deploy unaffected |

---

## Post-MVP

Push notifications, chat/feed, stake pooling, social sign-in, more sports.

---

## Paused

- **Mobile** (`apps/mobile/`) — resume when web validated with real users

---

## Operator notes

**Secrets (GitHub):** `ODDS_API_KEY`, `FOOTBALL_DATA_API_KEY`, `DATABASE_URL`, `AUTH_SECRET`, `CRON_SECRET`, `RESEND_API_KEY` (optional), GCP deploy secrets.

**Variables (GitHub):** `EMAIL_FROM` (optional, e.g. `The Syndicate <notifications@the-syndicate.uk>`).

**Local odds:** `ODDS_API_KEY` in `apps/web/.env.local` — omit for mock fixtures.

After shipping: update [CURRENT_STATE.md](./CURRENT_STATE.md) and check off spec phases.
