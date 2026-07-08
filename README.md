# The Syndicate

Social group accumulator betting platform for football fans. Each group member contributes one leg; when everyone submits, the acca locks with combined odds and bookmaker betslip links.

## Monorepo layout

```
apps/web/          Next.js web app + API
apps/mobile/       Expo iPhone client
packages/shared/   Zod schemas, types, constants
packages/database/ Prisma schema + client
docs/              Product and architecture specs
```

## Quick start

```bash
npm install
npm run db:push
npm run db:generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Copy `apps/web/.env.local` — defaults use SQLite at `packages/database/prisma/dev.db`.

For production, set `DATABASE_URL` to Postgres and generate a strong `AUTH_SECRET`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start web dev server |
| `npm run build` | Production build |
| `npm run db:push` | Push Prisma schema to DB |
| `npm run db:generate` | Generate Prisma client |

## MVP flows

1. Sign up / sign in
2. Create or join a group (invite code)
3. Owner starts a round
4. Members submit one leg each from mock fixtures
5. Acca auto-locks when all legs in
6. Open betslip link at best bookmaker
7. Owner settles round → points + group P/L

See [docs/PRODUCT.md](docs/PRODUCT.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Agent context

See [AGENTS.md](AGENTS.md) for AI coding conventions.
