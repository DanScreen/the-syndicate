# Documentation index

**Start here** if you are an agent or developer new to this repo — **do not rely on chat history.**

The Syndicate is a social group football acca platform. Production: [www.the-syndicate.uk](https://www.the-syndicate.uk).

---

## Agent quick start

1. Read **[CURRENT_STATE.md](./CURRENT_STATE.md)** — as-built truth (pages, APIs, env vars, code map, limitations).
2. Read **[ROADMAP.md](./ROADMAP.md)** → **Next** — what to build now.
3. Read the matching **spec** in [specs/](./specs/) if the task matches one.
4. Run locally:

```bash
npm install
docker compose up -d
cp apps/web/.env.example apps/web/.env.local   # DATABASE_URL, AUTH_SECRET, NEXTAUTH_URL; optional: ODDS_API_KEY, FOOTBALL_DATA_API_KEY, ADMIN_EMAILS
npm run db:migrate:deploy
npm run db:generate
npm run dev   # http://localhost:3000
```

5. After shipping: update docs in the **same commit** — see [AGENTS.md](../AGENTS.md).

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
| Platform admin & analytics | [specs/platform-admin.md](./specs/platform-admin.md) |
| Deploy, infra, or reduce GCP costs | [DEPLOYMENT.md](./DEPLOYMENT.md), [infra/terraform/README.md](../infra/terraform/README.md) |
| Commands & conventions | [AGENTS.md](../AGENTS.md) |

Specs are **design contracts**. [CURRENT_STATE.md](./CURRENT_STATE.md) is **as-built truth** — update it when you ship.

---

## What to build next (July 2026)

**MVP is shipped.** Priority is validating with real users (success metric: 10 users complete the full loop).

| # | Backlog item | Notes |
|---|--------------|-------|
| 1 | Validate with real users | Success metric — full loop on prod |
| 2 | Affiliate links | Tracked bookmaker deeplinks + disclosure — [specs/affiliate-and-betslips.md](./specs/affiliate-and-betslips.md) |
| 3 | Better betslip deeplinks | Acca-builder URLs, fewer hub fallbacks |
| 4 | FA Cup + EFL Cup | Quick win — `competitions.ts` |
| 5 | GCP cost reduction | Cloud SQL is ~90% of forecast; see [DEPLOYMENT.md](./DEPLOYMENT.md#cost-optimization) |
| 6 | Mobile apps (iOS + Android) | Parity with web — [specs/mobile-apps.md](./specs/mobile-apps.md) |

Full list: [ROADMAP.md](./ROADMAP.md).

---

## Document map

```
docs/
├── README.md              ← you are here
├── CURRENT_STATE.md       ← as-built: pages, APIs, code map, env, limitations
├── PRODUCT.md             ← vision, flows, MVP scope
├── ARCHITECTURE.md        ← stack, entities, subsystems
├── ROADMAP.md             ← priorities & status
├── DEPLOYMENT.md          ← GCP, CI, cron, cost optimization
├── MARKETING_BRIEF.md     ← positioning, taglines, homepage/about copy (draft)
└── specs/
    ├── competitions-and-results.md   ← Phases A–C done; Phase 1b backlog
    ├── group-stats-and-points.md     ← Phases 1–4 done
    ├── platform-admin.md             ← Admin, analytics, points-first UX (shipped)
    ├── affiliate-and-betslips.md     ← Affiliate tracking + betslip deeplink improvements (backlog)
    ├── round-deadline-lock.md        ← Lock at first kickoff + pick reminders (Phase 1 shipped)
    ├── multi-leg-accas.md            ← Opt-in 2–3 legs per member (deferred; owner setting)
    └── mobile-apps.md                ← iOS + Android strategy, parity plan, anti-divergence (spec)
```

---

## Updating docs

**Rule:** doc updates belong in the **same commit** as the code they describe.

See [AGENTS.md](../AGENTS.md) → Documentation maintenance.

| Change | Update |
|--------|--------|
| Shipped feature / fix | [CURRENT_STATE.md](./CURRENT_STATE.md) |
| Roadmap item done | [ROADMAP.md](./ROADMAP.md) |
| Spec phase done | Relevant [specs/](./specs/) checklist |
| User flow / scope change | [PRODUCT.md](./PRODUCT.md) |
| Architecture / schema pattern | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Deploy / infra / CI | [DEPLOYMENT.md](./DEPLOYMENT.md) |
| New env var | `apps/web/.env.example` + CURRENT_STATE |

Do **not** duplicate spec content into ARCHITECTURE — link instead.
