import { createApiFetcher } from "@tiki-acca/client";

/** Browser-side API calls: same origin, Auth.js session cookie. */
export const apiFetcher = createApiFetcher();
