# Documentation index

**Start here** if you are an agent or developer new to this repo.

The Syndicate is a social group football acca platform. Production: [www.the-syndicate.uk](https://www.the-syndicate.uk).

---

## How to use these docs

| If you need to… | Read |
|-----------------|------|
| Understand **what exists today** (APIs, env vars, file paths) | [CURRENT_STATE.md](./CURRENT_STATE.md) |
| Understand **product intent & user flows** | [PRODUCT.md](./PRODUCT.md) |
| Understand **system design** (stack, data model) | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| See **what to build next** | [ROADMAP.md](./ROADMAP.md) |
| **Implement a planned feature** | Relevant file in [specs/](./specs/) |
| Deploy or change infra | [DEPLOYMENT.md](./DEPLOYMENT.md), [infra/terraform/README.md](../infra/terraform/README.md) |
| Run commands & conventions | [AGENTS.md](../AGENTS.md) (repo root) |

### Recommended build order (planned work)

1. [specs/competitions-and-results.md](./specs/competitions-and-results.md) — Phase A: per-leg competition picker  
2. [specs/competitions-and-results.md](./specs/competitions-and-results.md) — Phase B: shared `Match` table + results ingest  
3. [specs/group-stats-and-points.md](./specs/group-stats-and-points.md) — Phase 1: unit-stake points  
4. [specs/group-stats-and-points.md](./specs/group-stats-and-points.md) — Phases 2–3: group/member stats & charts  

Specs are **design contracts**. [CURRENT_STATE.md](./CURRENT_STATE.md) is the **as-built truth** — update it when you ship.

---

## Document map

```
docs/
├── README.md              ← you are here
├── CURRENT_STATE.md       ← as-built: production, code map, env, scoring today
├── PRODUCT.md             ← vision, flows, MVP scope
├── ARCHITECTURE.md        ← stack, entities, high-level design
├── ROADMAP.md             ← priorities & status
├── DEPLOYMENT.md          ← GCP, GitHub Actions, Terraform
└── specs/                 ← feature specs (not yet built unless marked)
    ├── competitions-and-results.md
    └── group-stats-and-points.md
```

---

## Wiki or “AI Brain”?

**Use this repo’s docs — don’t add a separate wiki yet.**

| Approach | Verdict |
|----------|---------|
| **Notion / GitHub Wiki / Confluence** | Duplicates repo docs; drifts out of sync; agents can’t grep it in-context |
| **Cursor `AGENTS.md` + `docs/`** | ✅ Version-controlled, lives with code, loaded automatically |
| **`.cursor/rules/`** | ✅ Short routing rules; point to `docs/README.md` |
| **Dedicated “AI Brain” SaaS** | Overkill for current team size; same drift risk as wikis |

**When to reconsider:** multiple non-technical stakeholders need a dashboard, or docs exceed ~20 files and need search UX. Until then, keep one source of truth in `docs/` and update [CURRENT_STATE.md](./CURRENT_STATE.md) on each release.

---

## Updating docs (agents & humans)

**Rule:** doc updates belong in the **same commit** as the code they describe.

See also [AGENTS.md](../AGENTS.md) → Documentation maintenance.

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
