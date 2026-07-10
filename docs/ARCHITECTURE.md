# The Syndicate — Architecture

**As-built detail:** [CURRENT_STATE.md](./CURRENT_STATE.md) · **Index:** [README.md](./README.md)

---

## Overview

Monorepo, API-first. Web is production; mobile consumes same REST API (**paused**).

```mermaid
flowchart TB
  Web[apps/web] --> Shared[packages/shared]
  Web --> DB[packages/database]
  Web --> Odds[lib/odds]
  Web --> Results[lib/results]
  Web --> Stats[lib/stats]
  Cron[Cloud Scheduler] -->|sync-matches| Web
  Mobile[apps/mobile] -.-> Web
```

---

## Stack

| Layer | Choice |
|-------|--------|
| Web | Next.js 15 App Router, TypeScript, Tailwind v4, Recharts |
| API | Next.js Route Handlers `/api/*` |
| DB | PostgreSQL, Prisma |
| Auth | Auth.js v5 credentials, JWT sessions |
| Validation | Zod in `packages/shared` |
| Deploy | Cloud Run, Cloud SQL, GitHub Actions |
| IaC | Terraform `infra/terraform/` |

---

## Data model

| Entity | Purpose |
|--------|---------|
| **User** | Account; aggregate points (`Float`) |
| **Group** | Name, invite code, owner, status |
| **GroupMember** | Membership, role, group-scoped points |
| **Round** | Acca cycle: collecting → locked → settled; `accaBookmakerRankings` JSON at lock |
| **Leg** | One pick per member: fixture, `competitionId`, market, odds, outcome |
| **Match** | Canonical fixture result (football-data.org sync); reused for auto-settle |

Schema: `packages/database/prisma/schema.prisma`

---

## Subsystems

### Odds
Live ([The Odds API](https://the-odds-api.com/)) or mock. Fixtures fetched **per competition** slug. Bulk + lazy per-event markets. Retail bookmaker filter. At lock: `rankAccaBookmakers()` stores ranked list on `Round`.

→ [CURRENT_STATE.md](./CURRENT_STATE.md#odds--competitions-today)

### Settlement
Manual owner settle, owner-triggered auto-settle, or **hands-off** after hourly match sync. Market resolution in `resolve-leg.ts`. Email notifications on lock/settle (Resend, optional).

→ [CURRENT_STATE.md](./CURRENT_STATE.md#settlement)

### Scoring
**Unit-stake points:** win `odds−1`, loss `−1`, void `0`. Stats derive from outcome+odds (not stale `pointsAwarded`). £10 acca P/L on round.

→ `packages/shared/src/scoring.ts`

### Stats
Computed on read from settled rounds. Group + member + **cross-group user** APIs; Recharts on group page and dashboard. Share cards for copy/Web Share.

→ `apps/web/src/lib/stats/`

### Auth
Credentials + bcrypt. Session on web; Bearer JWT for mobile (`/api/auth/mobile/sign-in`).

---

## Deployment

GCP: Cloud Run + Cloud SQL + Secret Manager. Match sync via Cloud Scheduler → `POST /api/internal/sync-matches`.

See [DEPLOYMENT.md](./DEPLOYMENT.md).

Production URL: **https://www.the-syndicate.uk** (Cloudflare → Cloud Run, `europe-west2`).

---

## Mobile

Expo app in `apps/mobile/` — **paused**. Needs competition picker API changes before resume.
