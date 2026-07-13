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
  Cron[Cloud Scheduler] -->|sync-matches, warm-odds-cache| Web
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
| **User** | Account; `role` (`user` \| `admin`); aggregate `totalPoints` |
| **Group** | Name, invite code, owner, status |
| **GroupMember** | Membership, group role (`owner` \| `member`), group-scoped points |
| **Round** | Acca cycle: open → locked → settled; `accaBookmakerRankings` JSON at lock |
| **Leg** | One pick per member: fixture, `competitionId`, market, odds, outcome |
| **Match** | Canonical fixture result (football-data.org sync); reused for auto-settle |
| **AnalyticsEvent** | Product analytics: `sign_up`, `login`, `page_view` |

Schema: `packages/database/prisma/schema.prisma`

---

## Subsystems

### Odds
Live ([The Odds API](https://the-odds-api.com/)) or mock. Fixtures fetched **per competition** slug. Bulk + lazy per-event markets. Retail bookmaker filter. At lock: `rankAccaBookmakers()` stores ranked list on `Round`.

→ [CURRENT_STATE.md](./CURRENT_STATE.md#odds--competitions-today)

### Settlement
**System-only** — hands-off after match sync (every 5 min UTC); owner settle routes removed (July 2026) so bets are never self-graded. Escape hatch: platform admins settle stuck rounds from the **settlement queue** (`/admin/settlement`), which flags legs still pending 2h+ after kickoff. Sync bypasses football-data cache; leg outcomes update as matches finish; round settles when all legs ready. Market resolution in `resolve-leg.ts`. Email notifications on lock/settle (Resend, optional). Settlement funnels through a transactional `applyRoundSettlement()` whose first step is an atomic `locked → settled` claim (`updateMany`), so overlapping settle attempts award points **exactly once** — the loser throws `RoundNotSettleableError` and no-ops. The leg-lock transition (`open → locked`) uses the same claim pattern so only one final-leg submission reprices the acca.

### Leg editing
Members edit their own leg via `PATCH /api/legs/[id]` while the round is `open` or `locked`, until the **earliest kickoff** among the round's legs. Picks are re-validated like a fresh submit; edits on locked rounds re-run `lockRoundWithAccaPricing()` (combined odds, rankings, and deeplinks refresh at current prices) with rollback if repricing fails. After the first match kicks off, picks are final.

→ [CURRENT_STATE.md](./CURRENT_STATE.md#settlement)

### Scoring
**Unit-stake points:** win `odds−1`, loss `−1`, void `0`. **Points are the primary user-facing metric.** Profit equivalent: `points × stake` via `profitFromPoints()`. `Round.profitLossGbp` retained for admin/settlement.

→ `packages/shared/src/scoring.ts` · [specs/platform-admin.md](./specs/platform-admin.md)

### Stats
Computed on read from settled rounds. Group + member + **cross-group user** APIs; Recharts on group Performance tab and `/performance` page. Share cards for copy/Web Share.

→ `apps/web/src/lib/stats/`

### Web UI layout
- **Header:** `AppNav` — Groups (`/dashboard`) ↔ Performance (`/performance`) ↔ Admin (`/admin`, admin role only)
- **Group shell:** `groups/[id]/layout.tsx` + `GroupDataProvider` — shared fetch for sub-pages; polls every 60s while acca locked
- **Group tabs:** Round (`/groups/[id]`), Leaderboard, Performance
- **Locked round:** per-leg outcome badges (Won/Lost/Awaiting) → locked combined odds + bookmaker → betslip CTA until first result, then tracking only (no bookmaker comparison)

→ [CURRENT_STATE.md](./CURRENT_STATE.md#web-pages)

### Auth
Split config: edge-safe `auth.config.ts` (middleware, no Prisma) + `auth.ts` (credentials, DB). Session includes `user.role`; role refreshed from DB on each JWT update via `getSessionUserRole()`. Bearer JWT for mobile (`/api/auth/mobile/sign-in`).

### Platform admin
`ADMIN_EMAILS` env promotes users to `role: admin`. Admin tab in `AppNav`; pages at `/admin/*`; APIs at `/api/admin/*`. Session role refreshed from DB on each request — no re-login after adding an email. Lightweight `AnalyticsEvent` logging.

→ [specs/platform-admin.md](./specs/platform-admin.md)

### Marketing (public)
Homepage (`/`), about (`/about`). Turf Green tokens + Acca stack logo. Content in `lib/marketing-content.ts`.

→ [BRAND.md](./BRAND.md)

---

## Deployment

GCP: Cloud Run + Cloud SQL + Secret Manager + **Cloud Scheduler** (all provisioned by Terraform in `infra/terraform/`). Cron jobs call `POST /api/internal/sync-matches` and `POST /api/internal/warm-odds-cache` with Bearer `CRON_SECRET` from Secret Manager.

See [DEPLOYMENT.md](./DEPLOYMENT.md).

Production URL: **https://www.the-syndicate.uk** (Cloudflare → Cloud Run, `europe-west2`).

---

## Mobile

Expo app in `apps/mobile/` — **implementation paused**; Expo scaffold exists (auth, basic groups).

**Target:** functional parity with the website for member-facing flows. **Strategy:** [specs/mobile-apps.md](./specs/mobile-apps.md) — API-first, shared `packages/shared` contracts, EAS release for iOS + Android.

**Auth:** `POST /api/auth/mobile/sign-in` → Bearer JWT; `requireSession()` accepts Bearer or Auth.js cookie.

**Resume when:** web validated with real users (foundation / shared-contract work can start in parallel). See [ROADMAP.md](./ROADMAP.md).
