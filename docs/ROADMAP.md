# Roadmap

Production: [www.the-syndicate.uk](https://www.the-syndicate.uk) · **Index:** [README.md](./README.md)

---

## Success metric

10 users complete: sign up → group → submit leg → acca locks → settle → leaderboard.

---

## Status

### Done — core loop
- Live odds (The Odds API), extended markets, best-odds leg picker
- Per-leg competition picker (EPL, Championship, L1, L2, World Cup)
- Acca lock with combined bookmaker comparison
- Invite flow, round progress, leg picker UX, landing/SEO
- Auto-settle (football-data.org), manual settle
- Apex → www redirect (Cloudflare)

### Next — build in this order

| # | Feature | Spec |
|---|---------|------|
| 1 | ~~Per-leg competition picker~~ ✅ | [specs/competitions-and-results.md](./specs/competitions-and-results.md) Phase A |
| 2 | Shared `Match` table + results cron | [specs/competitions-and-results.md](./specs/competitions-and-results.md) Phase B |
| 3 | Unit-stake points | [specs/group-stats-and-points.md](./specs/group-stats-and-points.md) Phase 1 |
| 4 | Group & member stats + charts | [specs/group-stats-and-points.md](./specs/group-stats-and-points.md) Phases 2–3 |

### Backlog
- User profile (cross-group stats)
- Email notifications (round locked, settled)
- Real bookmaker-specific betslip deeplinks
- Terraform CI GCS permissions fix
- Optional: GCP load balancer for custom domain (Cloudflare Worker in use today)

### Post-MVP
- Push notifications, chat/feed, stake pooling, social sign-in, more sports

---

## Paused

- **Mobile** (`apps/mobile/`) — resume when web validated with real users

---

## Operator notes

**Secrets (GitHub):** `ODDS_API_KEY`, `FOOTBALL_DATA_API_KEY`, `DATABASE_URL`, `AUTH_SECRET`, GCP deploy secrets.

**Local odds:** `ODDS_API_KEY` in `apps/web/.env.local` — omit for mock fixtures.

After shipping: update [CURRENT_STATE.md](./CURRENT_STATE.md) and check off spec phases.
