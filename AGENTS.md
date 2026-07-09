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
| `packages/database` | Prisma schema (PostgreSQL; local Docker Compose, Cloud SQL in prod) |

## Commands

```bash
npm install          # from repo root
docker compose up -d # local Postgres
npm run dev          # web @ localhost:3000
npm run dev:mobile   # Expo dev server (iOS simulator)
npm run build        # production build
npm run db:migrate:deploy  # apply migrations (prod + local)
npm run db:generate  # prisma generate
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for GCP + GitHub Actions setup.
See [infra/terraform/README.md](infra/terraform/README.md) for Terraform infrastructure.

### Mobile

Requires the web API running (`npm run dev`). Set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` — use `http://localhost:3000` for iOS Simulator, or your machine's LAN IP for a physical device.

## Stack

- Next.js 15, TypeScript, Tailwind CSS v4
- Auth.js v5 (credentials, JWT sessions)
- Prisma + PostgreSQL (local via Docker Compose, Cloud SQL in production)
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

## Mobile auth

- `POST /api/auth/mobile/sign-in` returns `{ token, user }` (30-day JWT)
- Mobile sends `Authorization: Bearer <token>` on protected API routes
- Token stored in Expo SecureStore
