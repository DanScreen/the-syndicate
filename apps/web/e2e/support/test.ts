import { test as base } from "@playwright/test";
import { uniqueIp } from "./actors";

/**
 * `test` with the default `page`/`context` on its own forwarded IP, so each
 * test gets a fresh sign-in/sign-up rate-limit bucket (see `uniqueIp`).
 */
export const test = base.extend({
  // Not named `use`: the React hooks lint rule would claim it.
  extraHTTPHeaders: async ({}, provide) => {
    await provide({ "x-forwarded-for": uniqueIp() });
  },
});

export { expect } from "@playwright/test";
