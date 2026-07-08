# The Syndicate — Agent Guide

Social group acca platform. Football-first; mock odds in v1.

**Product spec:** [docs/PRODUCT.md](docs/PRODUCT.md)  
**Architecture:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Monorepo

| Path | Purpose |
|------|---------|
| `apps/web` | Next.js 15 App Router, API routes, Tailwind UI |
| `apps/mobile` | Expo React Native iPhone client |
| `packages/shared` | Zod schemas, types, constants |
| `packages/database` | Prisma schema (SQLite dev, Postgres-ready) |

## Commands

```bash
npm install          # from repo root
npm run dev          # web @ localhost:3000
npm run build        # production build
npm run db:push      # sync schema
npm run db:generate  # prisma generate
```

## Stack

- Next.js 15, TypeScript, Tailwind CSS v4
- Auth.js v5 (credentials, JWT sessions)
- Prisma + SQLite (dev)
- Expo for mobile

## Conventions

- API routes in `apps/web/src/app/api/`
- Shared validation in `packages/shared/src/schemas.ts`
- Mock odds in `apps/web/src/lib/odds/provider.ts` — swap for real API later
- Build vertical slices; don't add features outside MVP without asking
- One leg per member per round (enforced in API + DB unique constraint)

## Do not

- Process real money or place bets via API
- Add sports beyond football without updating PRODUCT.md
- Skip auth checks on protected API routes
- Start mobile-only features before web API is stable

## First slice (done)

Auth + dashboard + group CRUD + rounds + legs + settlement + leaderboard.
