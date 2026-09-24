import { execSync } from "node:child_process";
import path from "node:path";
import { COMPETITIONS } from "@tiki-acca/shared";
import { createUser, db } from "./support/db";
import { E2E_ADMIN, E2E_DATABASE_URL } from "./support/env";
import { E2E_FIXTURES } from "./support/fixtures-data";

/** Migrates and empties the E2E database, then seeds odds and the admin account. */
export default async function globalSetup() {
  const dbName = new URL(E2E_DATABASE_URL).pathname.slice(1);
  // This wipes the database — refuse anything that doesn't look disposable.
  if (!/e2e|test/i.test(dbName)) {
    throw new Error(`Refusing to reset "${dbName}": E2E database names must contain "e2e" or "test".`);
  }

  execSync("npx prisma migrate deploy", {
    cwd: path.resolve(__dirname, "../../../packages/database"),
    env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
    stdio: "pipe",
  });

  // Truncate rather than `migrate reset`: a reused local server keeps its
  // connections, and dropping the schema under them breaks cached statements.
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length > 0) {
    const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
    await db.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
  }

  const worldCup = COMPETITIONS.find((c) => c.id === "world-cup");
  if (!worldCup) throw new Error("world-cup competition missing from shared config");

  await db.oddsBulkSnapshot.create({
    data: {
      competitionId: worldCup.id,
      sport: worldCup.oddsApiSport,
      regions: "uk",
      fixtures: Object.values(E2E_FIXTURES),
      // Outlives any test run; the provider ignores expired snapshots.
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await createUser(E2E_ADMIN.firstName, { email: E2E_ADMIN.email, role: "admin" });
  await db.$disconnect();
}
