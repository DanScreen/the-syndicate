# The Syndicate — Agent Guide

Social group football acca platform. **Read [docs/README.md](docs/README.md) first — do not rely on chat history.**

| Doc | When |
|-----|------|
| [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md) | What exists today — **start here for implementation** (pages, APIs, code map, env) |
| [docs/ROADMAP.md](docs/ROADMAP.md) | **What to build next** |
| [docs/specs/](docs/specs/) | Spec checklists for backlog features |
| [docs/PRODUCT.md](docs/PRODUCT.md) | User flows & vision |
| [docs/BRAND.md](docs/BRAND.md) | Logo, design, marketing copy |
| [docs/specs/platform-admin.md](docs/specs/platform-admin.md) | Admin dashboard, leaderboards, analytics |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack & data model |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | GCP deploy, cron, **cost optimization** |

**Current priorities (July 2026):** Validate with real users → FA Cup + EFL Cup → GCP cost reduction. See [docs/ROADMAP.md](docs/ROADMAP.md).

After shipping: follow **Documentation maintenance** below.

## Documentation maintenance

**Every task that changes behaviour, APIs, env vars, or schema must update repo docs in the same PR/commit** — not as a follow-up.

### Before you build

1. Read [docs/README.md](docs/README.md) and [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md).
2. If the work matches a spec, read the relevant file in [docs/specs/](docs/specs/) and follow its checklist.

### After you ship (checklist)

| Change type | Update |
|-------------|--------|
| Any shipped feature or bugfix | [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md) — routes, env vars, file paths, “what works today” |
| Roadmap item completed | [docs/ROADMAP.md](docs/ROADMAP.md) — mark Done |
| Spec phase completed | Relevant [docs/specs/](docs/specs/) — check off items; record decisions on open questions |
| New/changed user flow or product scope | [docs/PRODUCT.md](docs/PRODUCT.md) |
| New subsystem, entity, or architectural pattern | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — brief; link to spec for detail |
| Deploy, secrets, infra, or CI | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and/or [infra/terraform/README.md](infra/terraform/README.md) |
| New `.env` variable | [apps/web/.env.example](apps/web/.env.example) + CURRENT_STATE env table |

### Do not

- Rely on chat history as documentation.
- Copy spec content into ARCHITECTURE or CURRENT_STATE — link instead.
- Leave CURRENT_STATE stale (future agents will trust it as as-built truth).

### Spec-only work (no code yet)

If you only write or revise a spec, update the spec file and [docs/ROADMAP.md](docs/ROADMAP.md). Do not edit CURRENT_STATE until code ships.

## Monorepo

| Path | Purpose |
|------|---------|
| `apps/web` | Next.js 15 App Router, API routes, Tailwind UI |
| `apps/mobile` | Expo React Native (**paused**) |
| `packages/shared` | Zod schemas, types, constants |
| `packages/database` | Prisma schema (PostgreSQL) |

## Commands

```bash
npm install
docker compose up -d
npm run dev              # web @ localhost:3000
npm run build
npm run db:migrate:deploy
npm run db:generate
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for GCP setup.

## Conventions

- API routes: `apps/web/src/app/api/`
- Validation: `packages/shared/src/schemas.ts`
- Odds: `apps/web/src/lib/odds/` — live when `ODDS_API_KEY` set
- One leg per member per round (DB unique constraint)
- Build vertical slices; don't expand scope without asking

## Do not

- Process real money or place bets via API
- Add sports without updating PRODUCT.md
- Skip auth on protected routes
- Duplicate spec content — link to `docs/specs/`

## Mobile (paused)

`POST /api/auth/mobile/sign-in` → Bearer JWT. Resume when web is stable.
