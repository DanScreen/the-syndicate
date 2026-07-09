# The Syndicate

Social group accumulator betting platform for football fans. Each group member contributes one leg; when everyone submits, the acca locks with combined odds and bookmaker betslip links.

## Monorepo layout

```
apps/web/          Next.js web app + API
apps/mobile/       Expo iPhone client
packages/shared/   Zod schemas, types, constants
packages/database/ Prisma schema + client
docs/              Product specs — start at docs/README.md
```

## Quick start (local)

Requires Docker for local PostgreSQL.

```bash
docker compose up -d
cp apps/web/.env.example apps/web/.env.local
cp packages/database/.env.example packages/database/.env
npm install
npm run db:migrate:deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Mobile (Expo)

Start the web API first, then the mobile app:

```bash
npm run dev              # terminal 1 — web API @ localhost:3000
cp apps/mobile/.env.example apps/mobile/.env
npm run dev:mobile       # terminal 2 — press `i` for iOS Simulator
```

On a physical iPhone, set `EXPO_PUBLIC_API_URL` to your machine's LAN IP.

## Environment

See `apps/web/.env.example` and `packages/database/.env.example`.

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Auth.js + mobile JWT signing secret |
| `NEXTAUTH_URL` | Public app URL (e.g. `http://localhost:3000`) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start web dev server |
| `npm run dev:mobile` | Start Expo dev server |
| `npm run build` | Production build |
| `npm run db:migrate` | Create/apply dev migrations |
| `npm run db:migrate:deploy` | Apply migrations (production/CI) |
| `npm run db:generate` | Generate Prisma client |

## Deployment

Hosted on **Google Cloud Platform**:

- **Infrastructure:** Terraform ([`infra/terraform/`](infra/terraform/))
- **App deploy:** GitHub Actions on push to `main`
- **Infra changes:** GitHub Actions on changes to `infra/terraform/`

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and [infra/terraform/README.md](infra/terraform/README.md).

## MVP flows

1. Sign up / sign in
2. Create or join a group (invite code)
3. Owner starts a round
4. Members submit one leg each (live odds when configured)
5. Acca auto-locks → best combined bookmaker
6. Owner settles round (manual or auto)
7. Leaderboard + round history

See [docs/README.md](docs/README.md), [docs/PRODUCT.md](docs/PRODUCT.md), [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md).

## Agent context

See [AGENTS.md](AGENTS.md) for AI coding conventions.
