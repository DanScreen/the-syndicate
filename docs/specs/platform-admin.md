# Spec: Platform admin & analytics

| Field | Value |
|-------|-------|
| **Status** | Shipped (July 2026) |
| **Depends on** | Auth, Prisma `User.role`, `AnalyticsEvent` |
| **As-built reference** | [../CURRENT_STATE.md](../CURRENT_STATE.md) |

---

## Goals

1. **Developer admin accounts** — platform-level access separate from group owner role.
2. **Admin dashboard** — product metrics (users, picks, accas, activity).
3. **Platform leaderboards** — rank groups and players by points (admin-only until more users).
4. **First-party customer analytics** — per-user web/mobile logins, 30-minute visits, page/screen views, and last activity in Postgres.
5. **Points-first UX** — points are the primary metric; profit = points × user stake.

---

## Roles

| Role | Scope | How granted |
|------|-------|-------------|
| `user` | Default — groups, picks, stats | Sign-up |
| `admin` | `/admin/*`, admin APIs | `ADMIN_EMAILS` env on sign-up/sign-in |
| `owner` / `member` | Group-scoped | Group membership (`GroupMember.role`) |

**Platform admin ≠ group owner.** A developer can be admin without owning any group.

### Granting admin

1. Set `ADMIN_EMAILS` (comma-separated, case-insensitive) in env.
2. User signs up or signs in with a matching email → `User.role` set to `admin`.
3. JWT/session refreshed with `role` from DB on each auth cycle (`auth.ts` jwt callback) — no re-login required after adding an email.

**Production:** GitHub Actions secret `ADMIN_EMAILS` → Cloud Run env (see [DEPLOYMENT.md](../DEPLOYMENT.md)).

**Local:** `apps/web/.env.local` — see `.env.example`.

---

## Admin pages

Protected by middleware (`/admin/*` requires login) + `requireAdminPage()` (redirects non-admins to `/dashboard`).

| Route | Purpose |
|-------|---------|
| `/admin` | Platform overview — users, groups, picks, accas, activity |
| `/admin/activity` | Searchable per-user web/mobile login, visit, view, and recency report |
| `/admin/settlement` | Settlement queue — locked rounds, overdue-leg flags, manual settle |
| `/admin/leaderboards` | Group + player rankings by points |
| `/admin/competitions` | Enable/disable competitions in the leg picker |
| `/admin/odds` | Odds API diagnostics — raw events, filter pipeline, quota |

Admin pages are **web-only** — no admin surface in the mobile app (by design).

### Settlement queue (`/admin/settlement`)

Settlement is system-only (owners cannot settle), so this page is the **escape hatch** for rounds the cron cannot resolve:

- Lists all `locked` rounds (rounds needing attention first, then oldest lock).
- A pending leg is flagged **overdue** when unresolved **2+ hours after its scheduled kickoff** (`OVERDUE_AFTER_HOURS` in `compute-settlement-queue.ts`) — highlights matches that likely finished but couldn't be auto-resolved (unrecognised market, missing match data).
- Admin picks won/lost/void for each pending leg (system-resolved outcomes are pre-filled and shown as badges) and settles the round via `POST /api/admin/rounds/[id]/settle`.
- Locked rounds: outcomes must cover every leg; reuses `applyRoundSettlement()` — the same exactly-once `locked → settled` claim as the cron; a lost race returns 409.
- Settled rounds that still have pending legs (early loss): queue lists them; admin submits outcomes only for remaining pending legs → `applyDeferredLegOutcome()`.

**Nav:** Admin users see **Admin** in `AppNav`. Sub-nav: Overview | Activity | Settlement | Leaderboards | Competitions | Odds (`AdminNav`).

**SEO:** `robots: noindex` on admin pages.

---

## Admin APIs

| Route | Auth | Response |
|-------|------|----------|
| `GET /api/admin/stats` | Admin session | Platform aggregates |
| `GET /api/admin/leaderboards` | Admin session | Group + player rankings |
| `GET /api/admin/competitions` | Admin session | Catalogue + enabled flags |
| `PATCH /api/admin/competitions` | Admin session | Toggle `{ competitionId, enabled }` |
| `GET /api/admin/odds-diagnostics` | Admin session | Odds API probe (`?competition=world-cup`) |
| `POST /api/admin/rounds/[id]/settle` | Admin session | Manual settle — outcomes for every leg (escape hatch) |
| `POST /api/analytics/events` | Web session / mobile bearer | Authenticated page/screen or foreground activity; server derives user, channel, and visit |

Non-admin → `403 Forbidden`. Unauthenticated → `401`.

---

## Platform overview metrics

| Metric | Definition |
|--------|------------|
| Players | `User` count |
| Groups | `Group` count |
| Picks | `Leg` count |
| Accas formed | Rounds with status `locked` or `settled` |
| In progress | Rounds `locked` |
| Settled | Rounds `settled` |
| Successful accas | Settled rounds with `profitLossGbp > 0` |
| Unsuccessful accas | Settled rounds with `profitLossGbp <= 0` |
| Sign-ups (7d / 30d) | `User.createdAt` |
| Logins (7d / 30d) | `AnalyticsEvent` type `login` |
| Page views (7d / 30d) | `AnalyticsEvent` type `page_view` |

---

## Platform leaderboards

| Leaderboard | Sort key | Notes |
|-------------|----------|-------|
| **Groups** | Sum of `GroupMember.points` per group | Owner name, member count + W/L shown |
| **Players** | `User.totalPoints` | All registered users; group count + W/L shown |

**Future:** Roll out public `/leaderboards` when user base grows — reuse `computePlatformLeaderboards()` and `PlatformLeaderboards` component.

---

## Analytics events

Model: `AnalyticsEvent` — `type`, optional `userId`, optional `channel` (`web` / `mobile`), optional normalised `path`, `createdAt`.

| Type | When recorded |
|------|----------------|
| `sign_up` | `POST /api/auth/sign-up` |
| `login` | Web sign-in (Auth.js `authorize`) + `POST /api/auth/mobile/sign-in` |
| `visit` | First authenticated activity after 30 minutes without page/screen activity |
| `page_view` | Every authenticated web App Router navigation and mobile route change |
| `app_open` | Mobile initial launch and background-to-foreground transition |

Login recording is fire-and-forget (`recordAnalyticsEventAsync`). Client activity uses a best-effort authenticated endpoint that awaits persistence but never blocks navigation. Visit creation is transactionally protected with a PostgreSQL advisory lock per user/channel.

### Limitations

- Complete route and visit coverage begins with migration `20260718213000_customer_activity_tracking`; older page views are partial.
- Historical login events mixed web and mobile, so they remain null-channel and appear as **Legacy logins**.
- Paths omit query strings and normalise dynamic group/blog identifiers.
- No IP addresses, device fingerprints, referrers, or advertising identifiers are collected.
- For production-grade analytics, consider Plausible / PostHog / GA4 later.

---

## Points-first UX

**Primary metric:** unit-stake **points** everywhere in user-facing stats.

| Concept | Implementation |
|---------|----------------|
| Leg points | `legPointsForOutcome()` — win `odds−1`, loss `−1`, void `0` |
| Profit equivalent | `profitFromPoints(points, stakeGbp)` → `points × stake` |
| UI converter | `StakeProfit` component on `/performance` and group Performance tab |

**Removed from primary UI:** Acca P/L cards on performance pages; round history shows round points not £ P/L.

**Still in DB:** `Round.profitLossGbp` for settlement emails and admin “successful acca” counts.

---

## Code map

| Path | Role |
|------|------|
| `apps/web/src/lib/admin.ts` | `getAdminEmails`, `resolveUserRole`, `requireAdmin`, `requireAdminPage` |
| `apps/web/src/lib/auth.config.ts` | Edge-safe Auth.js config (middleware) |
| `apps/web/src/lib/auth.ts` | Credentials provider, role refresh in JWT callback |
| `apps/web/src/lib/admin/compute-admin-stats.ts` | Overview aggregates |
| `apps/web/src/lib/admin/compute-platform-leaderboards.ts` | Leaderboard queries |
| `apps/web/src/lib/analytics.ts` | `recordAnalyticsEvent` |
| `apps/web/src/components/analytics/authenticated-page-tracker.tsx` | Global authenticated web navigation tracker |
| `apps/mobile/src/analytics/activity-tracker.tsx` | Global mobile route and foreground tracker |
| `apps/web/src/lib/admin/compute-user-activity.ts` | Paginated per-user activity aggregation |
| `apps/web/src/components/admin-user-activity.tsx` | Admin customer activity table |
| `apps/web/src/components/admin-page-shell.tsx` | Shared admin layout |
| `apps/web/src/components/admin-nav.tsx` | Overview / Leaderboards tabs |
| `apps/web/src/components/admin-stats.tsx` | Overview UI |
| `apps/web/src/components/platform-leaderboards.tsx` | Leaderboard tables |
| `apps/web/src/components/stake-profit.tsx` | Points → profit converter |
| `packages/shared/src/roles.ts` | `USER_ROLES`, `ANALYTICS_EVENT_TYPES` |
| `packages/shared/src/scoring.ts` | `profitFromPoints`, `formatProfitGbp` |

Migrations: `20260710100000_user_role_analytics`, `20260718213000_customer_activity_tracking`.

---

## Open decisions

- [ ] Public `/leaderboards` for all users (when to ship)
- [ ] Persist user stake preference (localStorage vs profile field)
- [ ] Richer analytics provider vs staying on `AnalyticsEvent`
