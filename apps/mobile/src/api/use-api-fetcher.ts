import { useAuth } from "@/auth/AuthProvider";
import { API_URL } from "@/config";
import { createApiFetcher, type ApiFetcher } from "@tiki-acca/client";
import { useMemo } from "react";

/** Fetcher for the shared `@tiki-acca/client` hooks, signed with the current session. */
export function useApiFetcher(): ApiFetcher {
  const { token } = useAuth();
  return useMemo(
    () =>
      createApiFetcher({
        baseUrl: API_URL,
        headers: (): Record<string, string> =>
          token ? { Authorization: `Bearer ${token}` } : {},
      }),
    [token]
  );
}
