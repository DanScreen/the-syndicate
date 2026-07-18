# Current state (as-built)

Last updated 18 July 2026 (longstanding group Chat tab shipped on web/mobile). **This file is the source of truth for agents — update when you ship. Do not rely on chat history.**

Production: **https://www.tikiacca.com** (apex → 301 to www via Cloudflare).

> **Rebrand (July 2026):** The Syndicate → **Tiki Acca** ([spec](./specs/rename-tiki-acca.md)). Groups are called "groups". **Legacy internal names kept on purpose** — GCP resources (Cloud SQL `the_syndicate`, Cloud Run `the-syndicate-web`, artifact repo), mobile SecureStore keys (`syndicate_token`/`syndicate_user`), GitHub repo name. Do not rename these.

Mobile (`apps/mobile/`) — v1 parity shipped and EAS project linked at `@the-syndicate/tiki-acca` (`0ad18d34-5681-4e1c-a208-e45064b0515c`). The non-scrolling sign-in screen doubles as a compact brand landing page using shared copy from `packages/shared/src/brand.ts`. Mobile auth uses a revocable, non-expiring `MobileSession` bearer token stored in SecureStore, so users remain signed in until explicit logout; legacy 30-day JWTs remain valid during rollout. Logged-in chrome: brand-only `AppHeader` (not a home link) + bottom `AppTabBar`. Groups list lives at `/(main)/home` (not `/`) so tab switches never hit the auth stack; its first load is held behind a full-page loading state to prevent layout shift. Root `Stack.Protected` gates sign-in/sign-up. **Developer testing:** Expo Go / device build ([DEVELOPER_TESTING.md](../apps/mobile/DEVELOPER_TESTING.md)); friend APK/TestFlight deferred.

---

## Agent onboarding (start here)

**Do not rely on chat history.** Follow this order:

1. **This file** — what exists, where code lives, env vars, limitations.
2. **[ROADMAP.md](./ROADMAP.md)** → **Next** — current build priority.
3. **Matching spec** in [specs/](./specs/) — checklist for the task.
4. **[AGENTS.md](../AGENTS.md)** — conventions, doc maintenance rules.

### Local setup

```bash
npm install
docker compose up -d          # PostgreSQL
cp apps/web/.env.example apps/web/.env.local   # fill DATABASE_URL, AUTH_SECRET, NEXTAUTH_URL
npm run db:migrate:deploy
npm run db:generate
npm run dev                   # http://localhost:3000
```

Omit `ODDS_API_KEY` for mock fixtures. Add `FOOTBALL_DATA_API_KEY` + `CRON_SECRET` to test match sync locally. Set `ADMIN_EMAILS` to enable the Admin tab.

### Deploy

Push to `main` → GitHub Actions (`.github/workflows/deploy.yml`): build → `db:migrate:deploy` → Cloud Run.

Match sync + odds warm: Cloud Scheduler (Terraform) → `POST /api/internal/sync-matches` (every 5 min UTC) and `POST /api/internal/warm-odds-cache` (every 6 h UTC) with Bearer `CRON_SECRET` from Secret Manager. See [DEPLOYMENT.md](./DEPLOYMENT.md).

### Code map

| Subsystem | Path |
|-----------|------|
| API routes | `apps/web/src/app/api/` |
| Shared schemas/types | `packages/shared/src/` |
| Market conflict helpers | `packages/shared/src/market-conflicts.ts` |
| Prisma schema | `packages/database/prisma/schema.prisma` |
| Odds | `apps/web/src/lib/odds/` |
| Settlement | `apps/web/src/lib/settlement/`, `apps/web/src/lib/results/` |
| Stats | `apps/web/src/lib/stats/` |
| Group chat | Dedicated web/mobile Chat tabs, `apps/web/src/components/group-chat.tsx`, `apps/mobile/src/components/group-chat.tsx`, APIs under `api/groups/[id]/messages` + `api/messages/[id]`, lifecycle writers/tests in `apps/web/src/lib/chat/`, shared contract `packages/shared/src/chat.ts` |
| Notifications | `apps/web/src/lib/notifications/` (branded email templates + layout; logo at `public/brand/email-logo.png`) |
| Auth | `apps/web/src/lib/auth.ts`, `apps/web/src/lib/auth.config.ts` |
| Settlement (auto) | `apps/web/src/lib/settlement/auto-settle-round.ts` |
| Round lifecycle | `apps/web/src/lib/rounds/open-round.ts`, `create-additional-round.ts`, `claim-lock-round.ts`, `lock-open-rounds-at-kickoff.ts`, `first-kickoff.ts` |
| Group UI | `apps/web/src/components/group-ui.tsx`, `group-stats.tsx` |
| App navigation | `apps/web/src/components/app-nav.tsx`, `mobile-nav.tsx`, `group-nav.tsx`, `header.tsx` |
| Logo & marketing | `apps/web/src/components/logo.tsx`, `components/marketing/` (`marketing-shell.tsx`, `session-aware-marketing-header.tsx`, `marketing-header.tsx`, `marketing-ctas.tsx`), `lib/marketing-content.ts` |
| Blog | `apps/web/content/blog/*.mdx` (posts), `apps/web/src/lib/blog.ts`, `app/blog/` — publish = git push; `draft: true` hides in prod. SEO frontmatter-driven (canonical, OG image, `BlogPosting` JSON-LD, tag hubs). Strict authoring standards: [BLOG.md](./BLOG.md) |
| SEO | `apps/web/src/app/sitemap.ts`, `robots.ts` |
| Favicon / app icons | `apps/web/src/app/icon.svg`, `favicon.ico` (16/32/48), `apple-icon.tsx` (`lib/brand/rondo-icon.tsx`) — extra-wide apex-up Triangle rondo disc; glyph source in `logo.tsx`. Metadata URLs use `?v=` cache-bust (`layout.tsx`) — bump when the mark changes |
| Brand archive | `apps/web/src/lib/brand/archive.ts`, `logo-alternatives.tsx` (unused alternatives), `docs/brand/logo-archive/v6-wide-apex-up/` (previous live logo vectors + rollback instructions) |
| Group layout | `apps/web/src/app/groups/[id]/layout.tsx`, `group-layout-client.tsx`, `context/group-data.tsx` |
| Scoring | `packages/shared/src/scoring.ts` |
| Competitions catalogue | `packages/shared/src/competitions.ts` |
| Platform admin | `apps/web/src/lib/admin.ts`, `lib/admin/`, `lib/competitions/settings.ts`, `app/admin/`, `components/admin-*` |
| Analytics | `apps/web/src/lib/analytics.ts`, `components/analytics/page-view.tsx` |

### What's next (July 2026)

See [ROADMAP.md](./ROADMAP.md) → **Next — backlog**. MVP shipped; validate with real users first.

---

## What works today

| Area | Status |
|------|--------|
| Auth (email/password, Auth.js JWT sessions) | ✅ |
| Groups, invite codes, join links (`?code=`), no member cap | ✅ |
| Legs per member (1 / 2 / 3) — owner create + Settings; updates open rounds | ✅ |
| Concurrent active bets — owner cap 1–5; member-created; web + mobile switcher | ✅ pending owner test |
| One leg per fixture within a round (prevents unpriced correlated bet builders) | ✅ |
| At least one active round per group (auto-created with group / after final active settlement) | ✅ |
| Rounds: open → locked → settled (badges: **Bet Open**, **Bet Locked**, **Bet Settled**) | ✅ |
| Live odds ([The Odds API](https://the-odds-api.com/)) + mock fallback | ✅ |
| Markets: h2h, totals (dynamic lines), spreads*, BTTS, double chance, correct score, corners/cards† | ✅ |
| Per-leg competition picker (admin-controlled; World Cup live by default) | ✅ |
| Leg picker: best odds only per selection | ✅ |
| Acca lock: best combined bookmaker across all legs | ✅ |
| Acca bookmaker rankings (best odds first, stored at lock) | ✅ |
| Real bookmaker betslip deeplinks (The Odds API) | ✅ |
| Match table + football-data.org sync cron | ✅ |
| Hands-off auto-settle (5-min cron; early settle on first loss; deferred remaining legs) | ✅ |
| Email + push notifications (lock, settle, pick reminders) | ✅ |
| System-only settlement (owner settle removed July 2026) | ✅ |
| Editable picks until first kickoff (open + locked; locked edits reprice acca; web + mobile) | ✅ |
| Admin settlement queue (`/admin/settlement`, overdue-leg flags, manual settle) | ✅ |
| Unit-stake points + leaderboard | ✅ |
| Group stats summary + cumulative points chart | ✅ |
| Member stats breakdowns + multi-member chart | ✅ |
| Dashboard cross-group stats + share cards | ✅ |
| Split app layout (Groups / Performance nav; group tabs) | ✅ |
| Platform admin dashboard + leaderboards (`/admin`) | ✅ |
| Product analytics (logins, signups, page views) | ✅ |
| Marketing site (homepage, about, Turf Green + Triangle rondo logo) | ✅ |
| Points-first stats UX + stake → profit converter | ✅ |
| Locked round UX: picks first, locked odds, bookmaker comparison until first result, in-progress leg results | ✅ |
| Round history, progress UI, landing/SEO | ✅ |
| Blog (file-based MDX, static, `/blog`) + sitemap.xml + robots.txt | ✅ |
| Longstanding group Chat tab + Bet-labelled lifecycle messages + reactions (web + mobile) | ✅ |
| Chat unread badges + batched push preference | ✅ |

\*Asian handicap only from exchange bookmakers in current World Cup UK feed — filtered out; handicap UI empty for those fixtures.

---

## Scoring

**Acca points** in `packages/shared/src/scoring.ts`:

| Outcome | Group points | Member points |
|---------|--------------|---------------|
| Acca won | `combinedOdds − 1` | `odds − 1` on each won leg (`0` if void) |
| Acca lost | `−1` | Same per-leg rule: won → `odds − 1`, lost → `−1`, void → `0` |

Example: acca @ 3.44 (legs 1.6 × 2.15) → **2.44** group pts; members **0.6** and **1.15** (not split). If that acca loses because one leg fails, the winning member still keeps `odds − 1` while the losing member gets `−1` (group still `−1`).

**Stats:** `groupAccaRoundPoints()` for group totals; `memberAccaLegPoints()` for members. Dashboard “Your points” + header total (`/dashboard`) and group leaderboard (`GET /api/groups/[id]`) **recompute live** from settled rounds (same helpers as Performance). The denormalized `Leg.pointsAwarded`, `GroupMember.points`/`legsWon`/`legsLost` and `User.totalPoints`/`legsWon`/`legsLost` are written incrementally at settlement (`pointsForMemberLeg` = current per-leg rule) and were **backfilled to the current rule by migration `20260716120000_backfill_member_leg_points`** (absolute recompute, idempotent). These stored columns are what the **admin platform leaderboards** (`compute-platform-leaderboards.ts`) read directly, so keep them correct. After any future scoring-rule change, ship a similar recompute migration (or run `npm run db:maintenance -- rescore-member-legs --execute` + `reconcile-points`). Performance charts use bet number on the X-axis (`Bet N` / `Start`); settlement date shows in tooltips (`dateLabel`) so same-day rounds do not collide.

**Points-first UX:** Points are the **primary metric** across performance pages, leaderboards, share cards, and round history. Users convert points to money with `profitFromPoints(points, stake)` — profit = points × stake (£). UI: `StakeProfit` component (default stake £10). **Group / acca points** use `pointsTone()` (negative → red). **Individual pick rows** use `pointsToneFromOutcome()` (won → green, lost → red).

**Acca P/L in DB:** `Round.profitLossGbp` still computed at settle (£10 default stake) for admin “successful acca” counts and settlement emails — not shown as the primary user-facing metric.

---

## Odds & competitions

Thirteen competitions in `packages/shared/src/competitions.ts`, covering every competition available from both configured provider accounts: EPL, Championship, La Liga, Ligue 1, Serie A, Bundesliga, Eredivisie, Primeira Liga, Brazil Série A, Champions League, European Championship, Copa Libertadores, and World Cup. **Admin toggles** which are visible in the leg picker (`CompetitionSetting` table; `/admin/competitions`). Default: **World Cup only**; newly discovered catalogue rows are created disabled. Match sync fetches enabled competitions plus any disabled competition that still has a pending leg, avoiding unnecessary football-data.org calls without stranding settlement.

Fixture list uses The Odds API with `commenceTimeFrom` in `YYYY-MM-DDTHH:MM:SSZ` format (no milliseconds) and client-side upcoming filter. When `ODDS_API_KEY` is set, **no mock fallback** — empty list if the bookmaker feed has no upcoming fixtures. **Production never serves demo fixtures**; mock data is local dev only (`source: "mock"`). Check `GET /api/health` → `odds: "configured" | "missing"`.

### Odds flow

```
GET /api/competitions                 → active catalogue (id + name)
GET /api/fixtures?competition=epl     → bulk markets (h2h, totals, spreads)
GET /api/fixtures/[id]/markets?competition=epl&tier=core → lazy per-event tier (default `core` = 5 credits; `specials` on demand)
POST /api/legs                        → best retail quote; stores competitionId slug
(lock) lockRoundWithAccaPricing()     → re-fetch quotes, rankAccaBookmakers(), store deeplinks on Leg
```

At lock, `Leg.betslipUrl` stores the chosen bookmaker's **real** outcome/event deeplink (never a generic football hub); `Leg.bookmakerLinks` maps retail bookmakers → Odds API links only. **Hub URLs** (`BOOKMAKER_HUB_URLS`) are a last-resort UI fallback and are tagged `linkQuality: "hub"`. Matching featured and alternate market lines (for example, standard + alternate Over 2.5 goals) merge bookmaker quotes by market type, selection, and bookmaker, retaining the best quote and available deeplink; this avoids losing broader alternate-feed coverage. New/edited picks enforce **one leg per fixture per round** because The Odds API exposes single-selection prices, not bookmaker correlation-adjusted bet-builder prices; combined odds therefore multiply legs from separate fixtures only. Occupied fixtures are disabled with a short accuracy explanation in both pickers, and the public homepage FAQ provides the full rationale. **While bet is open:** leg picker shows best odds only; **Compare bookmakers** shows a live current ranking + refreshed deeplinks from current quotes. **Once locked:** **final combined odds** + the **Compare bookmakers** ranking captured at lock (so members can pick the best bookmaker when placing the bet); primary CTA opens the best available deeplink (first pick when multi-leg) until the first result, then tracking only. Per-leg **Open** uses `bookmakerLinks[recommendedBookmaker]` when present.

Requires live odds (`ODDS_API_KEY`) — mock fixtures have no deeplinks. Odds are stored in **PostgreSQL** (`OddsBulkSnapshot`, `OddsEventSnapshot`) and refreshed by cron (`POST /api/internal/warm-odds-cache`). User picks read the DB; set `ODDS_DB_ONLY=true` in production to block live API calls from user traffic.

### Odds API usage (summary)

Full budgeting: [DEPLOYMENT.md — The Odds API](./DEPLOYMENT.md#the-odds-api--calls-credits--cron).

| Call type | Markets | Credits | When |
|-----------|---------|---------|------|
| Bulk fixtures | `h2h`, `spreads`, `totals` | **3** | Cron: once per enabled competition per warm run |
| Core extended | `btts`, `double_chance`, `correct_score`, `alternate_spreads`, `alternate_totals` | **5** per fixture | Cron + auto on fixture pick; extra goal handicaps & O/U lines |
| Specials | corners/cards (7 keys) | **7** per fixture | User only (“Load more markets”); not cron-warmed |

**Cron:** `warm-odds-cache` every **6 h UTC** → `3 × competitions + 5 × N` credits per run (`N` = fixtures in warm window). `sync-matches` (every 5 min) uses football-data.org, **not** The Odds API.

**Production target:** `ODDS_DB_ONLY=true` so only cron (+ rare admin probes) call the API.

### Acca bookmaker rankings

At lock, `rankAccaBookmakers()` in `apps/web/src/lib/odds/acca.ts` ranks all retail bookmakers by combined acca odds. Stored as `Round.accaBookmakerRankings` (JSON). Older locked rounds backfill lazily on `GET /api/groups/[id]`. **Open rounds** use a live current ranking for the Compare UI. **Locked rounds** show the ranking captured at lock. Web and mobile display the top three by default, with **Show all {N} bookmakers** / **Show top 3** controls for the complete ranking. `GET /api/groups/[id]` refreshes Odds API deeplinks for the CTA and per-leg Open (odds remain frozen at lock). Multi-leg CTAs label **Open first pick** (or **Open {bookmaker}** for hubs) — UK books rarely expose a one-click full-acca URL.

Types: `packages/shared/src/acca.ts`. Migration: `20260710010000_acca_bookmaker_rankings`.

### Key files

| Path | Role |
|------|------|
| `apps/web/src/lib/odds/provider.ts` | Live vs mock orchestration (per competition) |
| `packages/shared/src/competitions.ts` | Competition catalogue |
| `apps/web/src/lib/odds/the-odds-api.ts` | Bulk + per-event API |
| `apps/web/src/lib/odds/event-markets.ts` | Per-event markets (BTTS, props, corners, etc.) |
| `apps/web/src/lib/odds/odds-store.ts` | PostgreSQL odds snapshots (bulk + per-event tiers) |
| `apps/web/src/lib/odds/warm-cache.ts` | Cron odds refresh logic |
| `apps/web/src/lib/odds/market-builders.ts` | Odds API → app market mappers |
| `apps/web/src/lib/odds/merge-markets.ts` | Merge matching featured + alternate market quote coverage |
| `apps/web/src/lib/odds/quotes.ts` | Quote helpers + deeplink resolution (no hub fallback) |
| `apps/web/src/lib/odds/betslip-links.ts` | Ranked/per-leg links; hub detection; CTA link quality |
| `apps/web/src/lib/odds/acca.ts` | Acca bookmaker ranking + best combined |
| `apps/web/src/lib/odds/lock-round.ts` | Lock + reprice + store deeplinks; live link enrichment |
| `apps/web/src/lib/odds/bookmakers.ts` | Retail filter, sort best odds |
| `apps/web/src/components/group-ui.tsx` | Progressive 4-step leg picker (market list collapses into outcome choices), locked round picks, settle UI |
| `apps/web/src/components/app-nav.tsx` | Header nav (desktop): Home / About / Groups / Performance / Admin / Blog |
| `apps/web/src/components/mobile-nav.tsx` | Compact hamburger menu below `md` for marketing + app headers |
| `apps/web/src/app/account/page.tsx` | Account — profile, notification prefs, sign out (greeting in header links here) |
| `apps/web/src/components/group-nav.tsx` | Group tabs: Round / Chat / History / Leaderboard / Performance |
| `apps/web/src/components/group-layout-client.tsx` | Shared group shell + `GroupDataProvider` |
| `apps/web/src/context/group-data.tsx` | Group data context for sub-pages |

---

## Web pages

Protected routes enforced in `apps/web/src/middleware.ts` / `auth.config.ts`: `/dashboard`, `/groups/*` (**except** `/groups/join`), `/performance`, `/admin`, `/account`, `/settings`. `/groups/join` is public so invite links work signed-out — the page prompts Sign in / Sign up with `callbackUrl` back to the invite (`lib/callback-url.ts`). Middleware uses edge-safe `auth.config.ts` only (no Prisma); credentials + DB live in `auth.ts`. Middleware also runs on all non-static routes for the **origin-auth check** (`ORIGIN_AUTH_SECRET` + Cloudflare `x-origin-auth` header — blocks direct `*.run.app` traffic; `/api/health` and `/api/internal/*` exempt). Auth endpoints are **rate-limited** per IP (`lib/rate-limit.ts`): sign-in 10/5min, sign-up 5/hour. See [DEPLOYMENT.md](./DEPLOYMENT.md#ddos--abuse-protection).

| Path | Purpose |
|------|---------|
| `/` | Landing — hero, value props, how it works, FAQ, CTA (signed-in: app header + Groups/Performance CTAs) |
| `/about` | Product story, what we are/aren’t, responsible gambling (reachable when signed in) |
| `/blog`, `/blog/[slug]` | File-based MDX blog (static; drafts hidden in prod) |
| `/sign-in`, `/sign-up` | Auth — sign-up collects **first name** + **last name**; both preserve `callbackUrl` (e.g. invite return) |
| `/account` | Account — profile, notification prefs, sign out (via header greeting) |
| `/settings/notifications` | Redirect → `/account#notifications` (legacy / List-Unsubscribe) |
| `/dashboard` | **Groups home** — list of user's groups; **group/your points**; **current betslip** legs (fixture, market, selection, odds); waiting status if you haven't picked |
| `/performance` | Cross-group stats (`DashboardStats`) — group filter dropdown, charts, share cards |
| `/admin` | **Admin** — platform metrics (admin role only) |
| `/admin/settlement` | **Admin** — settlement queue: locked rounds, overdue legs (2h+ after KO), manual settle |
| `/admin/leaderboards` | **Admin** — group & player rankings by points |
| `/admin/competitions` | **Admin** — enable/disable competitions in leg picker |
| `/admin/odds` | **Admin** — Odds API diagnostics (fixture pipeline) |
| `/groups/create` | Create group (auth required; legs-per-member picker) |
| `/groups/join` | Join group — **public**; signed-out shows Sign in / Sign up (keeps `?code=`); signed-in auto-joins when `?code=` present |
| `/groups/[id]` | **Round** tab — active-bet switcher, new-bet action, multi-leg picker, picks, lock, settle |
| `/groups/[id]/history` | **History** tab — every settled acca with fixtures, markets, outcomes |
| `/groups/[id]/leaderboard` | Points leaderboard |
| `/groups/[id]/performance` | Group stats (`GroupStats`) — charts, member breakdown |
| `/groups/[id]/settings` | **Owner** — legs per member (all eligible open bets immediately) + maximum active bets (1–5) |

**Navigation:** Logo + **Social Group Betting** tagline (tagline hidden below `md`). Logo and **Home** → `/`. `AppNav` order: Home → About → Groups → Performance → Admin (admins) → **Blog** (rightmost). Below `md`, inline links collapse into `MobileNav` (hamburger) — signed-out: Home / About / Blog / Sign in / Sign up as peer links; signed-in adds **Account · {firstName}** → `/account`. Desktop greeting **Hi, {firstName}** → `/account` (notifications + sign out). Legacy `/settings/notifications` redirects to `/account#notifications`. Marketing pages use `SessionAwareMarketingHeader` (client `useSession`) so statically generated `/blog` still shows signed-in chrome. Inside a group, `GroupNav` tabs (Round / Chat / History / Leaderboard / Performance / **Settings** for owners) share data via `GroupDataProvider` (fetched once in group layout; polls every 60s while acca locked). Chat unread counts appear on the Chat tab, which polls its permanent group thread every 20 seconds while visible.

**Group cards (web + mobile):** one active bet keeps the detailed current betslip. Two or more active bets switch to a compact, action-first overview: up to three **Bet #N** rows with Open / Locked / In play status, pick or settlement progress, the current member's missing-pick warning, and combined odds when available; additional bets collapse into **+N more**. `GET /api/groups` exposes `activeBets` summaries for mobile, and the server-rendered web dashboard uses the same shared display helpers.

**Open round UI:** current combined odds + **Compare bookmakers** podium (logos; 1st–3rd emphasised) from legs submitted so far.
**Locked round UI:** picks with per-leg outcomes as matches finish → **locked combined odds + Compare bookmakers** podium (captured at lock) → betslip CTA until the first result, then tracking only. Polls every 60s while locked. **History** tab lists all settled rounds.

---

## Settlement

**System-only** (July 2026): group owners can no longer settle rounds — the owner manual-settle and owner auto-settle routes (`POST /api/rounds/[id]/settle`, `POST /api/rounds/[id]/auto-settle`) were removed. Settlement happens exclusively via the match-sync cron:

| Method | Route | Notes |
|--------|-------|-------|
| Auto (hands-off) | Via `POST /api/internal/sync-matches` | Cron sync → settles locked rounds when any leg loses **or** all legs are won/void; continues resolving pending legs on early-settled losses |
| Admin (escape hatch) | `POST /api/admin/rounds/[id]/settle` | Platform admin settles stuck locked rounds, or remaining pending legs after an early loss — see `/admin/settlement` |

Email and push notifications fire on **round locked**, **round settled**, and **pick reminders** (within 2h before first kickoff). Resend for email (`RESEND_API_KEY`, `EMAIL_FROM`); Expo Push API for mobile (`PushDevice` tokens). Per-user preferences at `/account` (web) and `(main)/account` (mobile). Deduped via `NotificationLog`; round-level `lockedNotificationSentAt` / `settledNotificationSentAt` set only when all members are satisfied (delivered or opted out). Failed lock/settle deliveries retried on `sync-matches` (5 min). Pick reminders cron: `POST /api/internal/round-reminders` every 15 min (Terraform). Notification times formatted in `Europe/London`. See [specs/notifications.md](./specs/notifications.md).

**Early settle on loss.** As soon as one leg is `lost`, the round settles: group scores −1 and concluded legs award member points under the per-leg rule (won → odds−1, lost → −1, void → 0). If no other open or locked bet remains, the next open round starts automatically; otherwise members continue through the existing active bets and can create another when the owner’s cap permits. Remaining legs stay `pending` until match sync (or admin) resolves them via `applyDeferredLegOutcome()` — still exactly-once (pending → outcome claim).

**Exactly-once settlement.** `applyRoundSettlement()` validates settleability, then runs in a `prisma.$transaction` with an atomic claim — `round.updateMany({ where: { status: "locked" }, data: { status: "settled" } })`. Overlapping settle attempts (e.g. two cron runs) can't double-count points: the loser matches zero rows and throws `RoundNotSettleableError`, treated as a benign `skipped` no-op.

**System chat messages.** Round lifecycle events append `RoundMessage` system messages to the group's permanent Chat thread ([specs/group-chat.md](./specs/group-chat.md)): leg submitted/changed/removed (`/api/legs` routes), round locked (`claimAndLockRound`, after the `open → locked` claim + successful pricing), leg results (`persistResolvableLegOutcomes` / `applyDeferredLegOutcome`, inside a `pending → outcome` claim transaction), and round settled (`applyRoundSettlement`, inside the settle transaction after the `locked → settled` claim). Each retains nullable `roundId` context and displays its stable **Bet #N**. Message writes are gated on the same atomic claims as the events themselves, so retried or overlapping lock/settle runs never double-post — proven by race tests in `apps/web/src/lib/chat/exactly-once.test.ts` (`npm test --workspace=@tiki-acca/web`; requires local PostgreSQL).

**Lock triggers.** A round moves `open → locked` when **every member has submitted `Round.legsPerMember` legs** or when the **earliest submitted leg kicks off** (partial accas — members under quota are excluded). `claimAndLockRound()` in `claim-lock-round.ts` atomically claims via `updateMany`, reprices, and emails; repricing failures revert to `open`. Kickoff locks run on each match-sync cron (5 min) and when loading `GET /api/groups/[id]`. **Reprice falls back to each leg’s stored odds** when live quotes are missing (fixture already kicked off / warmed cache miss) so kickoff locks don’t flap open↔locked. Loading a group with a full quota also retries lock. See [specs/round-deadline-lock.md](./specs/round-deadline-lock.md) and [specs/multi-leg-accas.md](./specs/multi-leg-accas.md).

**Lock is likewise atomic.** When two members submit the final legs at once, only one request reprices the acca (Odds API credits) and sends the lock email; repricing failures revert the round to `open`.

### Changing and removing picks (until first kickoff)

Members can change **their own leg** via `PATCH /api/legs/[id]` while the round is `open` **or** `locked`, up to the earliest kickoff among the round's legs. After the first match starts, edits return 403. Rules enforced server-side:

- Only the leg's owner may edit; pick is re-validated against live/mock odds like a fresh submit (competition enabled, selection exists, fixture not kicked off).
- Edited legs reset `matchId` and keep `outcome: "pending"`.
- **Locked rounds reprice**: after an edit, `lockRoundWithAccaPricing()` re-runs — combined odds, bookmaker rankings, and betslip links refresh at current prices for **all** legs. If repricing fails, the edit is rolled back (previous pick restored).
- Members can remove **their own leg** via `DELETE /api/legs/[id]` only while the round remains `open` and before its first kickoff. Locked/settled rounds reject removal. A replacement submission reuses the first available `legIndex`.
- UI: **Change** and **Remove** actions on the Round tab (web + mobile); removal requires confirmation and posts a `leg_removed` system chat message.

### Cron (internal)

| Route | Role |
|-------|------|
| `POST /api/internal/sync-matches` | football-data.org → `Match` table; locks open rounds at first kickoff; auto-settles locked rounds (incl. early loss); awards deferred legs on settled rounds; retries pending lock/settle notifications |
| `POST /api/internal/round-reminders` | Pick reminder emails/push (T−2h before kickoff) |
| `POST /api/internal/warm-odds-cache` | Refresh odds snapshots in DB |

### Key files

| Path | Role |
|------|------|
| `apps/web/src/lib/settlement/auto-settle-round.ts` | Hands-off auto-settle + deferred pending legs on settled rounds |
| `apps/web/src/app/api/legs/[id]/route.ts` | Change/remove own leg (PATCH/DELETE) — cutoff, authorization, locked-round edit reprice |
| `apps/web/src/lib/admin/compute-settlement-queue.ts` | Locked + early-settled-pending queue + 2h overdue-leg flags |
| `apps/web/src/components/admin-settlement.tsx` | Settlement queue UI + manual settle / resolve-remaining form |
| `apps/web/src/app/api/admin/rounds/[id]/settle/route.ts` | Admin manual settle (locked) or deferred leg resolve (settled) |
| `apps/web/src/lib/settlement/resolve-round-outcomes.ts` | Match → leg outcomes; `persistResolvableLegOutcomes()` |
| `apps/web/src/lib/settlement/apply-round-settlement.ts` | Atomic settle + `applyDeferredLegOutcome()` |
| `apps/web/src/lib/notifications/dispatch.ts` | Central notification dispatcher |
| `apps/web/src/lib/notifications/send-pick-reminders.ts` | Pick reminder cron logic |
| `apps/web/src/lib/notifications/retry-pending-round-notifications.ts` | Retry failed lock/settle notifications |
| `apps/web/src/lib/notifications/round-notifications.ts` | Lock / settle / reminder payloads |
| `apps/web/src/lib/notifications/channels/` | Email + Expo push adapters |
| `apps/web/src/lib/notifications/email.ts` | Resend client (HTML + plain text + `List-Unsubscribe`) |
| `apps/web/src/lib/notifications/templates.ts` | Branded lock / settle / reminder copy + HTML |
| `apps/web/src/lib/notifications/email-layout.ts` | Turf Green email shell, logo, CTAs |
| `apps/web/public/brand/email-logo.png` | Triangle rondo disc for email clients |
| `apps/web/src/components/notification-settings.tsx` | Web preferences UI |
| `apps/mobile/src/notifications/register.ts` | Push permission + token registration |
| `GET/PATCH /api/user/notification-preferences` | User notification toggles |
| `POST/DELETE /api/user/push-token` | Mobile Expo push token |
| `apps/web/src/lib/results/football-data.ts` | football-data.org fetch, team matching, **regulation (90 min) scores** for settlement |
| `apps/web/src/lib/results/sync-matches.ts` | Upsert matches for all competitions |
| `apps/web/src/lib/results/match-store.ts` | DB lookup for auto-settle; aligns goals to leg home/away when sources disagree |
| `apps/web/src/lib/results/resolve-leg.ts` | Market → outcome logic (90-minute score) |
| `apps/web/src/lib/settlement/apply-round-settlement.ts` | Transactional settle: atomic `locked → settled` claim, points/P&L, `RoundNotSettleableError` |

---

## Admin & analytics

→ Full spec: [specs/platform-admin.md](./specs/platform-admin.md)

Platform admins (`User.role = admin`) see an **Admin** tab with **Overview** and **Leaderboards**.

**Granting admin:** set `ADMIN_EMAILS` (comma-separated) in env. Matching users promoted on sign-up or sign-in. Session role refreshes from DB on each request (no re-login needed).

### Overview (`/admin`)

| Metric | Source |
|--------|--------|
| Players, groups, picks | `User`, `Group`, `Leg` counts |
| Accas formed | Rounds with status `locked` or `settled` |
| Successful accas | Settled rounds with `profitLossGbp > 0` |
| Sign-ups (7d/30d) | `User.createdAt` |
| Logins (7d/30d) | `AnalyticsEvent` type `login` |
| Page views (7d/30d) | `AnalyticsEvent` type `page_view` |

### Leaderboards (`/admin/leaderboards`)

| Leaderboard | Ranked by |
|-------------|-----------|
| Groups | Sum of `GroupMember.points` per group; columns: name, **owner**, members, points, W/L record |
| Players | `User.totalPoints` (all groups); **all registered users** listed (0 pts if no groups) |

Admin-only for now; public rollout planned when user base grows.

### Analytics events

`AnalyticsEvent` table: `sign_up`, `login`, `page_view`. Recorded on sign-up, sign-in (web + mobile), and server-rendered page loads.

### Key files

| Path | Role |
|------|------|
| `apps/web/src/lib/auth.config.ts` | Edge-safe Auth.js (middleware) |
| `apps/web/src/lib/auth.ts` | Credentials sign-in, JWT role refresh |
| `apps/web/src/lib/admin.ts` | `requireAdmin`, `ADMIN_EMAILS` promotion |
| `apps/web/src/lib/admin/compute-admin-stats.ts` | Overview aggregates |
| `apps/web/src/lib/admin/compute-platform-leaderboards.ts` | Leaderboard queries |
| `apps/web/src/lib/analytics.ts` | `recordAnalyticsEvent` |
| `apps/web/src/components/admin-page-shell.tsx` | Admin layout + nav |
| `apps/web/src/components/admin-stats.tsx` | Overview UI |
| `apps/web/src/components/platform-leaderboards.tsx` | Leaderboard tables |
| `apps/web/src/components/stake-profit.tsx` | Points → profit converter |
| `GET /api/admin/stats` | JSON overview (admin session) |
| `GET /api/admin/leaderboards` | JSON leaderboards (admin session) |

**Analytics limitations:** page views on server render only (not in-group tab switches). See spec for details.

---

## Stats

Computed on read from settled rounds. No materialised stats tables.

Member summary **best / worst leg** = highest / lowest decimal odds across the member's legs (not round points). Category **best / worst** (competition, bet type, team) on group member breakdown **and** `/performance` = highest / lowest **average points per individual settled leg** (min 3 legs in at least two categories). Pick win rate is won / (won + lost) on that member's legs only — independent of whether the group acca won.

| Route | Purpose |
|-------|---------|
| `GET /api/groups/[id]/stats` | Group summary + cumulative points chart |
| `GET /api/groups/[id]/members/[userId]/stats` | Member breakdown, favourites, best/worst |
| `GET /api/user/stats` | Cross-group performance summary + chart + individual insights (competition / bet type / team) |

| Path | Role |
|------|------|
| `apps/web/src/lib/stats/compute-group-stats.ts` | Group summary metrics |
| `apps/web/src/lib/stats/compute-member-stats.ts` | Member breakdown |
| `apps/web/src/lib/stats/compute-user-stats.ts` | Cross-group user stats + personal competition/bet-type/team insights |
| `apps/web/src/lib/stats/compute-member-chart.ts` | Multi-member chart series |
| `apps/web/src/lib/stats/helpers.ts` | Shared helpers (favourites, best/worst, live net points); chart labels `formatBetAxisLabel` + `formatSettledDateLabel`; `CHART_ORIGIN_LABEL` (`Start`) at 0 pts |
| `apps/web/src/components/group-stats.tsx` | Group performance UI (Recharts) |
| `apps/web/src/components/dashboard-stats.tsx` | Cross-group performance UI (`/performance`) |
| `apps/web/src/components/share-card.tsx` | Shareable performance image (PNG) + copy text fallback |
| `apps/web/src/lib/share/render-performance-image.ts` | Canvas renderer for branded share cards |

---

## Environment variables

### Local (`apps/web/.env.local`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL |
| `AUTH_SECRET` | Yes | Auth.js + verification of legacy mobile JWTs during rollout |
| `NEXTAUTH_URL` | Yes | e.g. `http://localhost:3000` |
| `ODDS_API_KEY` | No | Live odds; omit = mock |
| `ODDS_API_SPORT` | No | Default `soccer_fifa_world_cup` (fallback only) |
| `FOOTBALL_DATA_API_KEY` | No | Match sync |
| `FOOTBALL_DATA_CACHE_TTL_MS` | No | In-memory cache TTL for football-data fetches (default 60s; bypassed on cron sync) |
| `ODDS_API_CACHE_TTL_MS` | No | DB snapshot TTL for odds (default 30 min) |
| `ODDS_DB_ONLY` | No | When `true`, user routes read odds DB only (cron must refresh) |
| `ODDS_WARM_CORE_WITHIN_HOURS` | No | Cron prefetches core extended markets within N hours of kickoff (default 72) |
| `CRON_SECRET` | No | Bearer token for `/api/internal/*` cron routes |
| `RESEND_API_KEY` | No | Email notifications via Resend |
| `EXPO_ACCESS_TOKEN` | No | Optional Expo Push API auth (higher rate limits) |
| `EMAIL_FROM` | No | Sender address (required with `RESEND_API_KEY`) |
| `ADMIN_EMAILS` | No | Comma-separated emails granted platform admin |
| `ORIGIN_AUTH_SECRET` | No | Blocks direct-to-Cloud-Run traffic; must match Cloudflare Transform Rule header — [DEPLOYMENT.md](./DEPLOYMENT.md#ddos--abuse-protection) |

### Production (GitHub Actions → Cloud Run)

Secrets: `DATABASE_URL`, `AUTH_SECRET` (Terraform Secret Manager + `deploy.yml`), `ODDS_API_KEY`, `FOOTBALL_DATA_API_KEY`, `RESEND_API_KEY` (optional), GCP deploy secrets. `CRON_SECRET` is in Secret Manager (Terraform); optional GitHub secret only to seed Terraform without rotating.

Env vars on Cloud Run: `NEXTAUTH_URL`, `EMAIL_FROM`, `ADMIN_EMAILS` (from GitHub secret), `ODDS_API_SPORT`, `ODDS_API_REGIONS=uk`, etc. See `.github/workflows/deploy.yml`.

---

## Database (Prisma)

Core models: `User`, `Group`, `GroupMember`, `Round`, `Leg`, `Match`, `AnalyticsEvent`, `CompetitionSetting`, `RoundMessage`, `MessageReaction`.

- `RoundMessage` — group-scoped permanent chat: required `groupId`, nullable `roundId` for lifecycle-event Bet context, user banter (`kind: "user"`) + append-only system messages (`kind: "system"`, `eventType`: `leg_submitted | leg_changed | leg_removed | round_locked | leg_result | round_settled`; `legId` set on active pick announcements so the betslip row can mirror reactions). User posts run through shared `containsProfanity` (same list as names/groups). Existing messages were backfilled by `20260718200000_group_scoped_chat`; its trigger derives `groupId` for old-revision writes during a rolling deploy, with `20260718201000_group_chat_rolling_compat` ensuring the trigger on existing development databases. Legs submitted before group chat shipped may lack announcements; backfill with `npm run db:maintenance -- backfill-leg-announcements --execute` (preview first).
- `MessageReaction` — emoji reactions on messages, unique per `(messageId, userId, emoji)`. The bar shows **only used emoji chips**; a muted **React** / **+** opens a viewport-level picker (quick picks 🔥😂💀👀🫡🍀, then more). The API validates any single Unicode emoji. Pick rows mirror the latest `leg_submitted` / `leg_changed` message for their `legId`.
- `GroupMember.lastReadMessageAt` — group-wide unread cursor; dashboard cards and dedicated Chat tabs show unread counts.
- `NotificationPreference.pushChat` — chat push opt-in (default on). User messages notify other members at most once per ten-minute group bucket; active 20-second thread polling suppresses foreground pushes.

- `User.firstName` / `User.lastName` — collected at sign-up; header greeting uses first name only (`lib/user-display.ts`).
- `User.name` — full display name (`firstName lastName`) for leaderboards, picks, emails.
- `User.role` — platform role: `user` (default) or `admin` (via `ADMIN_EMAILS`).
- `AnalyticsEvent` — lightweight product analytics (`type`, `userId?`, `path?`, `createdAt`).
- `Group.legsPerMember` — 1–3 (default 1); owner create / Settings.
- `Group.maxActiveBets` — owner-selected 1–5 (default 1); counts `open` + `locked` rounds. Above 1, any member may create a bet if below the cap and every existing open bet has a leg.
- `Round.betNumber` — stable group-scoped `Bet #N` display number; backfilled for existing rounds.
- `Round.legsPerMember` — set at round open; owner Settings updates every eligible `open` round before first kickoff. Locked / kickoff-in-progress rounds keep their quota.
- Up to `legsPerMember` legs per user per round (`@@unique([roundId, userId, legIndex])`).
- **Fixture uniqueness rule:** new/edited picks allow only one leg per `fixtureId` in a round, regardless of market, because same-match combinations require correlation-adjusted bet-builder pricing unavailable from the current feed. See `packages/shared/src/market-conflicts.ts`. Enforced on `POST`/`PATCH` `/api/legs`; web/mobile pickers disable occupied fixtures. Existing settled history is unchanged. The older `fix-duplicate-markets` maintenance remains available for historical same-market-family cleanup.
- Leg stores `legIndex` + fixture snapshot: teams, kickoff, `competitionId` (slug), `competition` (display name), optional `matchId` FK, market, odds, bookmaker, `betslipUrl`, `bookmakerLinks` JSON, outcome.
- `Match` — canonical result per fixture (`externalDataId` from football-data.org).
- `Round.accaBookmakerRankings` — JSON array of ranked bookmakers at lock.
- `CompetitionSetting` — `competitionId` slug + `enabled` flag for leg-picker visibility (seeded: World Cup on, every other competition off; new catalogue entries are inserted off).
- Groups always retain at least one open or locked round. At the default cap of 1, settlement opens the next automatically. At higher caps, members create additional bets explicitly; PostgreSQL advisory locks make cap/empty-bet checks atomic. Legacy groups without an active round get one on next load.
- `Round.lockedNotificationSentAt` / `settledNotificationSentAt` — email dedup.

Schema: `packages/database/prisma/schema.prisma`

Recent migrations include `20260718190000_concurrent_group_bets` and `20260718193000_concurrent_group_bets_constraints`.

---

## API routes (web)

| Route | Auth | Purpose |
|-------|------|---------|
| `GET /api/competitions` | Session | Enabled competitions for leg picker |
| `GET /api/fixtures` | Session | List fixtures (`?competition=` required) |
| `GET /api/fixtures/[id]/markets` | Session | Extended markets (`?competition=` required) |
| `POST /api/legs` | Session | Submit leg (rejects any second leg on the same fixture — 409) |
| `PATCH /api/legs/[id]` | Leg owner | Edit own pick until first kickoff (locked rounds reprice; one-leg-per-fixture rule) |
| `DELETE /api/legs/[id]` | Leg owner | Remove own pick while round is open and before first kickoff |
| `GET /api/groups` | Session | Groups list + single-bet `activeLegs` + compact multi-bet `activeBets` summaries + yourLeg / yourLegCount + chat unread count |
| `POST /api/groups` | Session | Create group (`name`, optional `legsPerMember` 1–3 and `maxActiveBets` 1–5) |
| `PATCH /api/groups/[id]` | Owner | Update `legsPerMember` and/or `maxActiveBets`; lower caps preserve existing bets and block creation until capacity returns |
| `POST /api/groups/[id]/rounds` | Member | Create another open bet when owner cap >1, below cap, and no empty open bet exists |
| `POST /api/internal/sync-matches` | `CRON_SECRET` | Sync football-data.org → `Match` |
| `POST /api/internal/warm-odds-cache` | `CRON_SECRET` | Refresh odds DB snapshots |
| `GET /api/groups/[id]` | Member | Group + all `activeRounds` (round-scoped betslip data) + compatibility `activeRound` + recent settled bets + latest active-leg announcements/reactions + chat unread count |
| `GET /api/groups/[id]/history` | Member | Full settled bet history (fixtures, markets, outcomes) |
| `GET /api/groups/[id]/stats` | Member | Group summary stats + chart series |
| `GET /api/groups/[id]/members/[userId]/stats` | Member | Member breakdown + favourites |
| `GET /api/user/stats` | Session | Cross-group performance stats |
| `GET/PATCH /api/user/notification-preferences` | Session | Notification toggles |
| `POST /api/auth/mobile/sign-in` | Public (rate-limited) | Create revocable persistent mobile session |
| `POST /api/auth/mobile/refresh` | Mobile bearer | Upgrade a valid legacy JWT to a persistent session (persistent tokens pass through) |
| `POST /api/auth/mobile/sign-out` | Mobile bearer | Revoke the current device session |
| `GET/POST /api/groups/[id]/messages` | Member | Cursor-paginated permanent group thread (`before`/`after`, latest pick announcements included) / post group-wide text (500 chars, profanity filter, 10/min) |
| `GET/POST /api/rounds/[id]/messages` | Member | Compatibility alias for older clients; resolves to the containing group thread |
| `DELETE /api/messages/[id]` | Author or group owner | Soft-delete a user message (body becomes `Message deleted`) |
| `POST /api/messages/[id]/reactions` | Member | Toggle one validated Unicode emoji reaction |
| `POST/DELETE /api/user/push-token` | Session / mobile bearer | Expo push token |
| `POST /api/internal/round-reminders` | Cron | Pick reminder dispatch |
| `GET /api/admin/stats` | Admin | Platform summary metrics |
| `GET /api/admin/leaderboards` | Admin | Group + player point rankings |
| `GET /api/admin/competitions` | Admin | All competitions + enabled flags |
| `PATCH /api/admin/competitions` | Admin | Enable/disable competition for users |
| `POST /api/admin/rounds/[id]/settle` | Admin | Manual settle (escape hatch for stuck rounds) |
| `GET /api/admin/odds-diagnostics` | Admin | Probe Odds API pipeline (`?competition=`) |
| `GET /api/health` | Public | Health check (+ `odds: configured|missing`) |

---

## Known limitations

1. **football-data.org free tier:** All 13 catalogue competitions are exposed by the configured account. Match sync only requests enabled competitions and competitions with pending legs; EPL/Championship may be empty off-season.
2. **Settlement is system-only** — auto-settle runs after match sync (every 5 min); leg outcomes update as matches finish; round settles when **any leg loses** or **all legs are won/void**. Remaining legs on an early loss keep resolving via `applyDeferredLegOutcome()`. Owners cannot settle (routes removed July 2026). Overlapping settle attempts are safe — transactional, exactly-once via an atomic `locked → settled` claim (see [Settlement](#settlement)). Rounds the system cannot resolve are handled by admins via the **settlement queue** (`/admin/settlement`) — pending legs 2h+ after kickoff (including leftovers after early settle) are flagged for intervention.
3. **Email notifications** require Resend setup (`RESEND_API_KEY`, `EMAIL_FROM`); skipped if unset.
4. **Auto-settle requires synced `Match` rows** — 5-min cron or manual `POST /api/internal/sync-matches`.
5. **Cross-competition acca** — often no single bookmaker; best-per-leg odds locked at submission; per-leg deeplinks when Odds API provides them.
6. **Betslip deeplinks** — selection/event links from Odds API (`includeLinks`); hubs only as labelled last resort. **No one-click full multi-leg betslip** for most UK books — CTA opens first available pick; users add remaining legs via per-leg Open. Mock mode has hubs only.
7. **The Odds API quota** — credits = `markets × regions`. Cron warm: **3** bulk + **5 × N** core per enabled competition every 6 h (`N` = fixtures within `ODDS_WARM_CORE_WITHIN_HOURS`, default 72). User “specials” tier = **7** per fixture on demand only. Set `ODDS_DB_ONLY=true` so users do not call the API. See [DEPLOYMENT.md](./DEPLOYMENT.md#the-odds-api--calls-credits--cron).
8. **Terraform CI** needs `storage.objectAdmin` on the deploy SA for the GCS state bucket. If CI fails with `storage.objects.list` denied, grant bucket access once (see [infra/terraform/README.md](../infra/terraform/README.md#terraform-ci-state-bucket-access)), then re-run the workflow. `deploy.yml` bootstraps `CRON_SECRET` in Secret Manager from the GitHub secret when missing.
9. **Odds snapshots in PostgreSQL** — shared across Cloud Run instances; refreshed by `POST /api/internal/warm-odds-cache` (Cloud Scheduler job in Terraform). Set `ODDS_DB_ONLY=true` so users never burn API credits. In-memory cache remains for quota block/snapshot and football-data only.
10. **Mobile app** — Native app code complete. **You:** test via Expo Go or `expo run:ios --device` ([DEVELOPER_TESTING.md](../apps/mobile/DEVELOPER_TESTING.md)). **Mates:** Android APK; iPhone TestFlight after store fees. [FRIEND_TESTING.md](../apps/mobile/FRIEND_TESTING.md). Leg-edit parity shipped (same "Change my pick" flow as web). Admin pages are web-only by design.
11. **Auth JWT** — middleware uses edge-safe `auth.config.ts` (no Prisma); `auth.ts` refreshes `role` from DB on each session update.
12. **Chat realtime** — the permanent group thread polls every 20 seconds while the Chat tab is visible; no WebSocket/SSE, typing indicators, read receipts, media, or reaction notifications in v1. Chat push needs Expo/APNs/FCM setup on a physical device.
13. **Concurrent-bet notification links** — reminder/lock/settle payloads carry `roundId`, but current web/mobile group URLs do not preselect that bet; the user lands on the group’s default active bet and can switch manually.

## Production checklist (operators)

- [x] `ODDS_API_KEY` in GitHub secrets
- [x] `FOOTBALL_DATA_API_KEY` in GitHub secrets
- [x] `CRON_SECRET` in Secret Manager + Cloud Scheduler jobs (`sync-matches`, `warm-odds-cache`) via Terraform
- [x] `NEXTAUTH_URL=https://www.tikiacca.com`
- [x] Cloudflare Worker + www redirect configured
- [ ] `ORIGIN_AUTH_SECRET`: Cloudflare Transform Rule (`x-origin-auth`) + GitHub secret — [DEPLOYMENT.md](./DEPLOYMENT.md#ddos--abuse-protection)
- [ ] Cloudflare rate-limiting rule on `/api/auth/*` (free tier: 1 rule)
- [x] `RESEND_API_KEY` + `EMAIL_FROM` in GitHub (optional, for email notifications)
- [x] `ADMIN_EMAILS` in GitHub secrets + passed to Cloud Run via `deploy.yml`

## GCP cost notes

Cloud SQL is typically **~90%** of GCP forecast. Current Terraform defaults: `db-f1-micro`, zonal, Enterprise edition, PITR enabled in prod. Cloud Run `min_instances = 0`.

Options to reduce spend: verify instance tier in console, disable PITR if acceptable, reduce backup retention, or migrate to Neon/Supabase. See [DEPLOYMENT.md](./DEPLOYMENT.md#cost-optimization).
