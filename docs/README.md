# Documentation index

**Start here** if you are an agent or developer new to this repo — **do not rely on chat history**.

The Syndicate is a social group football acca platform. Production: [www.the-syndicate.uk](https://www.the-syndicate.uk).

---

## Agent quick start

1. Read **[CURRENT_STATE.md](./CURRENT_STATE.md)** — as-built truth (APIs, env vars, file paths, limitations).
2. Read **[ROADMAP.md](./ROADMAP.md)** → **Next** — what to build now.
3. Read the matching **spec** in [specs/](./specs/) before implementing.
4. Run locally: `npm install` → `docker compose up -d` → copy `apps/web/.env.example` to `.env.local` → `npm run db:migrate:deploy` → `npm run dev`.
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
| Stack & data model overview | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Deploy or change infra | [DEPLOYMENT.md](./DEPLOYMENT.md), [infra/terraform/README.md](../infra/terraform/README.md) |
| Commands & conventions | [AGENTS.md](../AGENTS.md) |

Specs are **design contracts**. [CURRENT_STATE.md](./CURRENT_STATE.md) is **as-built truth** — update it when you ship.

---

## What to build next (July 2026)

See [ROADMAP.md](./ROADMAP.md) → **Next — backlog**. Core MVP is shipped.

---

## Document map

```
docs/
├── README.md              ← you are here
├── CURRENT_STATE.md       ← as-built: production, code map, env, APIs
├── PRODUCT.md             ← vision, flows, MVP scope
├── ARCHITECTURE.md        ← stack, entities, subsystems
├── ROADMAP.md             ← priorities & status
├── DEPLOYMENT.md          ← GCP, GitHub Actions, Terraform, cron
└── specs/
    ├── competitions-and-results.md   ← Phase C remaining
    └── group-stats-and-points.md     ← Phase 4 remaining
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
