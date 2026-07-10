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
cp apps/web/.env.example apps/web/.env.local   # DATABASE_URL, AUTH_SECRET, NEXTAUTH_URL
npm run db:migrate:deploy
npm run db:generate
npm run dev   # http://localhost:3000
```

5. After shipping: update docs in the **same commit** — see [AGENTS.md](../AGENTS.md).

**Paused:** `apps/mobile/` — web only until validated with real users.

---

## How to use these docs

| If you need to… | Read |
|-----------------|------|
| **What exists today** (start here for code) | [CURRENT_STATE.md](./CURRENT_STATE.md) |
| **What to build next** | [ROADMAP.md](./ROADMAP.md) |
| **Implement a planned feature** | Relevant file in [specs/](./specs/) |
| Product intent & user flows | [PRODUCT.md](./PRODUCT.md) |
| Brand, logo, design directions | [BRAND.md](./BRAND.md) |
| Deploy, infra, or reduce GCP costs | [DEPLOYMENT.md](./DEPLOYMENT.md), [infra/terraform/README.md](../infra/terraform/README.md) |
| Commands & conventions | [AGENTS.md](../AGENTS.md) |

Specs are **design contracts**. [CURRENT_STATE.md](./CURRENT_STATE.md) is **as-built truth** — update it when you ship.

---

## What to build next (July 2026)

**MVP is shipped.** Priority is validating with real users (success metric: 10 users complete the full loop).

| # | Backlog item | Notes |
|---|--------------|-------|
| 1 | FA Cup + EFL Cup | Quick win — `competitions.ts` |
| 2 | GCP cost reduction | Cloud SQL is ~90% of forecast; see [DEPLOYMENT.md](./DEPLOYMENT.md#cost-optimization) |
| 3 | User profile page | Optional polish; `/performance` already covers stats |
| 4 | football-data.org tier upgrade | Ops — L1/L2 sync 403 on free tier |
| 5 | Mobile catch-up | Paused until web validated |

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
└── specs/
    ├── competitions-and-results.md   ← Phases A–C done; Phase 1b backlog
    └── group-stats-and-points.md     ← Phases 1–4 done
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
