# The Syndicate — Agent Guide

Social group football acca platform. **Read [docs/README.md](docs/README.md) first.**

| Doc | When |
|-----|------|
| [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md) | What exists today — **start here for implementation** |
| [docs/specs/](docs/specs/) | Planned features — read the relevant spec before building |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Build order & status |
| [docs/PRODUCT.md](docs/PRODUCT.md) | User flows & vision |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack & data model |

After shipping: update **CURRENT_STATE.md** and **ROADMAP.md**.

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
