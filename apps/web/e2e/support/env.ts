/** Shared constants for the E2E server, global setup and specs. */

export const E2E_PORT = Number(process.env.E2E_PORT ?? 3100);
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

/**
 * A dedicated database — global setup wipes it on every run. Defaults to the
 * docker compose Postgres; CI points this at its service container.
 */
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgresql://tikiacca:tikiacca@localhost:5432/tiki_acca_e2e";

/** Seeded by global setup (password `E2E_PASSWORD`) and listed in ADMIN_EMAILS. */
export const E2E_ADMIN = {
  email: "e2e-admin@tikiacca.com",
  firstName: "Ada",
};

/** Every seeded user shares this password so specs can sign in as anyone. */
export const E2E_PASSWORD = "e2e-password-123";
