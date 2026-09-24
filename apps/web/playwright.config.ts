import { defineConfig, devices } from "@playwright/test";
import { E2E_ADMIN, E2E_BASE_URL, E2E_DATABASE_URL, E2E_PORT } from "./e2e/support/env";

/**
 * End-to-end tests: a production build (`next build && next start`) against a
 * throwaway database that global setup resets and seeds. Odds come from a
 * seeded DB snapshot via `ODDS_DB_ONLY` — the same read path production uses —
 * so nothing calls The Odds API.
 *
 * Run with `npm run test:e2e` (needs Postgres from `docker compose up -d`).
 */

// Helpers in the test process talk to the same database as the server.
process.env.DATABASE_URL = E2E_DATABASE_URL;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // Tests share one server and one database; each creates its own users and
  // groups, so they're safe to run in parallel.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: E2E_BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      // The golden path is the flow most people hit on a phone.
      testMatch: /golden-path\.spec\.ts/,
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${E2E_PORT}`,
    // Not /api/health: the server starts before global setup creates the DB.
    url: `${E2E_BASE_URL}/sign-in`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      AUTH_SECRET: "e2e-auth-secret-not-for-production-use-000000",
      NEXTAUTH_URL: E2E_BASE_URL,
      AUTH_TRUST_HOST: "true",
      ADMIN_EMAILS: E2E_ADMIN.email,
      // Any non-empty key switches the provider to the DB snapshot path;
      // ODDS_DB_ONLY stops it falling through to a live fetch on a miss.
      ODDS_API_KEY: "e2e-no-live-calls",
      ODDS_DB_ONLY: "true",
      // Blank anything a developer's .env.local could otherwise leak into the
      // server: real email, origin lock, live results feeds, pushes.
      RESEND_API_KEY: "",
      EMAIL_FROM: "",
      ORIGIN_AUTH_SECRET: "",
      ALLOWED_ORIGIN: "",
      CRON_SECRET: "e2e-cron-secret",
      FOOTBALL_DATA_API_KEY: "",
      API_FOOTBALL_KEY: "",
      BETSAPI_KEY: "",
      EXPO_ACCESS_TOKEN: "",
      OUTRIGHTS_ENABLED: "",
      ESTIMATED_ODDS_ENABLED: "",
    },
  },
});
