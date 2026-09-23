# Documentation index

**Start here** if you are an agent or developer new to this repo — **do not rely on chat history.**

Tiki Acca is a social group football acca platform. Production: [www.tikiacca.com](https://www.tikiacca.com).

---

## Agent quick start

1. Read **[CURRENT_STATE.md](./CURRENT_STATE.md)** — as-built truth (pages, APIs, env vars, code map, limitations).
2. Read **[ROADMAP.md](./ROADMAP.md)** → **Next** — what to build now.
3. Read the matching **spec** in [specs/](./specs/) if the task matches one.
4. Run locally: [README → Quick start](../README.md#quick-start-local). Optional keys (`ODDS_API_KEY`, `FOOTBALL_DATA_API_KEY`, `ADMIN_EMAILS`, …) are listed in `apps/web/.env.example`.
5. Conventions, commands and doc-maintenance rules: [AGENTS.md](../AGENTS.md) — the single source for agent instructions (Cursor and Claude Code both load it).

**Mobile:** [specs/mobile-apps.md](./specs/mobile-apps.md) — dev: [DEVELOPER_TESTING.md](../apps/mobile/DEVELOPER_TESTING.md); friends: [FRIEND_TESTING.md](../apps/mobile/FRIEND_TESTING.md).

---

## How to use these docs

| If you need to… | Read |
|-----------------|------|
| **What exists today** (start here for code) | [CURRENT_STATE.md](./CURRENT_STATE.md) |
| **What to build next** | [ROADMAP.md](./ROADMAP.md) |
| **Implement a planned feature** | Relevant file in [specs/](./specs/) |
| **Mobile apps (iOS + Android)** | [specs/mobile-apps.md](./specs/mobile-apps.md) |
| Product intent & user flows | [PRODUCT.md](./PRODUCT.md) |
| Brand, logo, design | [BRAND.md](./BRAND.md) |
| Positioning, taglines, marketing copy | [MARKETING_BRIEF.md](./MARKETING_BRIEF.md) |
| Video ad production (AI-generated) | [VIDEO_AD_BRIEF.md](./VIDEO_AD_BRIEF.md) |
| Platform admin & analytics | [specs/platform-admin.md](./specs/platform-admin.md) |
| **Add an odds market or change odds provider** | [ODDS_PROVIDERS.md](./ODDS_PROVIDERS.md) — verified coverage limits; read before adding outrights. Sourcing plan: [specs/odds-and-results-sourcing.md](./specs/odds-and-results-sourcing.md) |
| Deploy, infra, or reduce GCP costs | [DEPLOYMENT.md](./DEPLOYMENT.md), [infra/terraform/README.md](../infra/terraform/README.md) |
| Commands & conventions | [AGENTS.md](../AGENTS.md) |
| Web app layout & scripts | [apps/web/README.md](../apps/web/README.md) |
| Database schema & migrations | [packages/database/README.md](../packages/database/README.md) |
| Shared types & business logic | [packages/shared/README.md](../packages/shared/README.md) |
| CI workflows at a glance | [.github/workflows/README.md](../.github/workflows/README.md) |

Specs are **design contracts**. [CURRENT_STATE.md](./CURRENT_STATE.md) is **as-built truth** — update it when you ship.

---

## What to build next (July 2026)

**MVP is shipped.** Priority is validating with real users (success metric: 10 users complete the full loop).

| # | Backlog item | Notes |
|---|--------------|-------|
| 1 | Validate with real users | **Current priority** — full loop on prod |
| 2 | Season readiness (2026–27) | Mostly ops — enable leagues via `/admin/competitions`; cups + empty states — [specs/season-readiness.md](./specs/season-readiness.md) |
| 3 | Live matchday | Per-leg push + live round view — [specs/live-matchday.md](./specs/live-matchday.md) |
| 4 | Settle-day recap share card | Invite loop — [specs/settle-recap-share.md](./specs/settle-recap-share.md) |
| 5 | Affiliate links | Tracked bookmaker deeplinks + disclosure — [specs/affiliate-and-betslips.md](./specs/affiliate-and-betslips.md) |

Full list: [ROADMAP.md](./ROADMAP.md) — seasons/leaderboards, streaks & badges, deeplinks, GCP costs, mobile stores.

---

## Document map

```
docs/
├── README.md              ← you are here
├── CURRENT_STATE.md       ← as-built: pages, APIs, code map, env, limitations
├── PRODUCT.md             ← vision, flows, MVP scope
├── ARCHITECTURE.md        ← stack, entities, subsystems
├── ROADMAP.md             ← priorities & status
├── DEPLOYMENT.md          ← GCP, CI, cron, cost optimization, ops scripts
├── ODDS_PROVIDERS.md      ← odds/results provider evaluation, verified coverage limits
├── BRAND.md               ← logo, palette, design tokens
├── MARKETING_BRIEF.md     ← positioning, taglines, homepage/about copy (draft)
├── BLOG.md                ← blog authoring standards
├── DESIGN_REVIEW.md       ← July 2026 design review decisions + deferred items
├── APP_STORE_READINESS.md ← store submission checklist
├── app-store/             ← listing metadata, review notes, rating/privacy worksheets
├── legal/                 ← cookie & privacy notice source
├── brand/logo-archive/    ← previous live logo vectors + rollback steps
├── VIDEO_AD_BRIEF.md      ← AI-generated video ad "The Cage": concept, shot list, prompts, compliance
└── specs/
    ├── competitions-and-results.md   ← Phases A–C done; Phase 1b backlog
    ├── group-stats-and-points.md     ← Phases 1–4 done
    ├── platform-admin.md             ← Admin, analytics, points-first UX (shipped)
    ├── affiliate-and-betslips.md     ← Affiliate tracking + betslip deeplink improvements (backlog)
    ├── round-deadline-lock.md        ← Lock at first kickoff + pick reminders (Phase 1 shipped)
    ├── notifications.md              ← Email + push notification plan (planned)
    ├── estimated-odds-fill.md        ← Median-backfill for missing bookmaker quotes (planned)
    ├── multi-leg-accas.md            ← Owner 1–3 legs per member (shipped Phases 1–3)
    ├── concurrent-group-bets.md      ← Owner 1–5 simultaneous active bets (owner test pending)
    ├── mobile-apps.md                ← iOS + Android strategy, parity plan, anti-divergence (spec)
    ├── season-readiness.md           ← World Cup → 2026–27 season transition + cups (backlog, urgent)
    ├── group-chat.md                 ← Round banter thread + reactions + system messages (build priority)
    ├── group-chat-build-plan.md      ← Execution steps, model per step, session prompts
    ├── live-matchday.md              ← Per-leg result push + live round view (backlog)
    ├── odds-and-results-sourcing.md  ← Multi-source odds + results under £100/month (proposed)
    ├── seasons-and-public-leaderboards.md ← Season windows, /leaderboards, monthly awards (backlog)
    ├── rename-tiki-acca.md           ← The Syndicate → Tiki Acca rename (done)
    ├── settle-recap-share.md         ← Settle-day recap share card / invite loop (backlog)
    ├── solo-unlimited-legs.md        ← Solo accas with unlimited legs (shipped)
    └── streaks-and-badges.md         ← Pick streaks + badge catalogue (backlog)
```

## Updating docs

**Rule:** doc updates belong in the **same commit** as the code they describe. The full change-type → doc matrix is in [AGENTS.md](../AGENTS.md) → Documentation maintenance.
