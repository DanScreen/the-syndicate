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
3. **Platform leaderboards** — rank syndicates and players by points (admin-only until more users).
4. **Lightweight analytics** — logins, sign-ups, page views in Postgres.
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
| `/admin/leaderboards` | Syndicate + player rankings by points |
| `/admin/competitions` | Enable/disable competitions in the leg picker |

**Nav:** Admin users see **Admin** in `AppNav`. Sub-nav: Overview | Leaderboards (`AdminNav`).

**SEO:** `robots: noindex` on admin pages.

---

## Admin APIs

| Route | Auth | Response |
|-------|------|----------|
| `GET /api/admin/stats` | Admin session | Platform aggregates |
| `GET /api/admin/leaderboards` | Admin session | Syndicate + player rankings |
| `GET /api/admin/competitions` | Admin session | Catalogue + enabled flags |
| `PATCH /api/admin/competitions` | Admin session | Toggle `{ competitionId, enabled }` |

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
| **Syndicates** | Sum of `GroupMember.points` per group | Member count + W/L shown |
| **Players** | `User.totalPoints` | Group count + W/L shown |

**Future:** Roll out public `/leaderboards` when user base grows — reuse `computePlatformLeaderboards()` and `PlatformLeaderboards` component.

---

## Analytics events

Model: `AnalyticsEvent` — `type`, optional `userId`, optional `path`, `createdAt`.

| Type | When recorded |
|------|----------------|
| `sign_up` | `POST /api/auth/sign-up` |
| `login` | Web sign-in (Auth.js `authorize`) + `POST /api/auth/mobile/sign-in` |
| `page_view` | Server render via `<PageView path="…" />` on `/`, `/about`, `/dashboard`, `/performance`, `/admin`, `/admin/leaderboards` |

Recording is fire-and-forget (`recordAnalyticsEventAsync`) — failures logged, never block auth.

### Limitations

- Page views only on server-rendered navigations (not client tab switches inside group shell).
- No unique visitors, referrers, or device data.
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
| `apps/web/src/components/admin-page-shell.tsx` | Shared admin layout |
| `apps/web/src/components/admin-nav.tsx` | Overview / Leaderboards tabs |
| `apps/web/src/components/admin-stats.tsx` | Overview UI |
| `apps/web/src/components/platform-leaderboards.tsx` | Leaderboard tables |
| `apps/web/src/components/stake-profit.tsx` | Points → profit converter |
| `apps/web/src/components/analytics/page-view.tsx` | Page view recorder |
| `packages/shared/src/roles.ts` | `USER_ROLES`, `ANALYTICS_EVENT_TYPES` |
| `packages/shared/src/scoring.ts` | `profitFromPoints`, `formatProfitGbp` |

Migration: `20260710100000_user_role_analytics`.

---

## Open decisions

- [ ] Public `/leaderboards` for all users (when to ship)
- [ ] Persist user stake preference (localStorage vs profile field)
- [ ] Richer analytics provider vs staying on `AnalyticsEvent`
