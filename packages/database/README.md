# @tiki-acca/database

Prisma schema, migrations, and client for Tiki Acca. Postgres in every real environment; `prisma/dev.db` is a leftover SQLite file and is not used by the current `datasource` (which is `postgresql`, driven by `DATABASE_URL`).

## Layout

- `prisma/schema.prisma` — the schema. Model-level and field-level `///` doc comments explain non-obvious constraints (e.g. why `dateOfBirth` is nullable, why only token hashes are stored) — read those before changing a model.
- `prisma/migrations/` — one directory per migration, applied in lexical (timestamp) order. Never edit an already-applied migration; add a new one instead.
- `prisma/seed.ts` — minimal seed run via `npm run seed`. Currently just verifies connectivity/user count; it is not a fixtures generator.
- Marketing and demo data seeds live outside this package, in [`tools/marketing/seeds/`](../../tools/marketing/seeds/) — `demo-seed.ts` (the "Thursday Club" App Store reviewer / screenshot account, `npm run marketing:seed`, also run against production on demand by `.github/workflows/seed-demo.yml`) and `video-ad-seed.ts` (`npm run video-ad:seed`). Keep fixtures out of this package: it ships with the web app.
- `src/index.ts` — exports the shared `PrismaClient` instance consumed by `apps/web`.

## Common commands

Run from this directory (or via the equivalent root-level `npm run` scripts):

```bash
npm run generate        # regenerate the Prisma client after a schema change
npm run migrate         # create + apply a new migration in dev (prisma migrate dev)
npm run migrate:deploy  # apply pending migrations without prompting (used in CI/deploy)
npm run push            # push schema changes without a migration (local prototyping only)
npm run seed            # run prisma/seed.ts
```

## Adding a schema change

1. Edit `prisma/schema.prisma`.
2. `npm run migrate` — names and applies the migration locally, regenerating the client.
3. Commit the new `prisma/migrations/<timestamp>_<name>/` directory alongside the schema change.
4. `npm run migrate:deploy` runs automatically as part of the web deploy (see `docs/DEPLOYMENT.md`) — you don't run this against production yourself.

Requires `DATABASE_URL` in `.env` (copy from `.env.example`); see the root `README.md` for the full local setup flow.
