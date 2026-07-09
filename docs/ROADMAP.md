# The Syndicate — Roadmap

Prioritised website improvements. Mobile app is paused; focus is web at [www.the-syndicate.uk](https://www.the-syndicate.uk).

## Success metric

**10 users** complete the full loop: sign up → create/join group → submit leg → acca locks → settle → view leaderboard.

---

## Tier 1 — Core loop UX

| Item | Status |
|------|--------|
| The Odds API integration (live fixtures + UK bookmaker odds) | Done |
| Invite link copy button | Done |
| Auto-fill join code from invite URL (`/groups/join?code=...`) | Done |
| Round progress (member checklist, status banners) | Done |
| Card-based leg picker (fixtures, markets, selections) | Done |
| Dashboard onboarding for new users | Done |

## Tier 2 — Product polish

| Item | Status |
|------|--------|
| Landing page improvements + responsible gambling footer | Done |
| SEO / Open Graph meta tags | Done |
| Recent round history on group page | Done |
| Production `ODDS_API_KEY` in GitHub secrets | **You:** add secret |

## Tier 3 — Next up

| Item | Status |
|------|--------|
| **Apex domain (`the-syndicate.uk`)** — redirects to `www` via Cloudflare rule | Done |
| **Competition picker + shared results** — [spec](./COMPETITIONS_AND_RESULTS.md) | Spec |
| User profile page (stats across groups) | Planned |
| Email notifications (round locked, leg settled) | Planned |
| Real betslip deeplinks (bookmaker-specific) | Planned |
| Results sync job (football-data → `Match` table) | Planned (see spec) |
| Custom domain via GCP load balancer (optional) | Planned |
## Tier 4 — Post-MVP

- Push notifications
- Multiple sports
- Stake pooling / payments
- Group chat / activity feed
- Social sign-in (Apple / Google)

---

## Odds API setup

1. Sign up at [the-odds-api.com](https://the-odds-api.com/)
2. Local: add `ODDS_API_KEY` to `apps/web/.env.local`
3. Production: GitHub → Settings → Secrets → `ODDS_API_KEY`
4. Redeploy (push to `main`)

Without a key, the app falls back to mock fixtures automatically.

## Paused

- Expo mobile app (`apps/mobile/`) — resume when web loop is validated with real users
