import { reportEmailUnverified } from "@/api/client";
import { useAuth } from "@/auth/AuthProvider";
import { API_URL } from "@/config";
import { createApiFetcher, type ApiFetcher } from "@tiki-acca/client";
import { useMemo } from "react";

/** Fetcher for the shared `@tiki-acca/client` hooks, signed with the current session. */
export function useApiFetcher(): ApiFetcher {
  const { token } = useAuth();
  return useMemo(() => {
    const fetcher = createApiFetcher({
      baseUrl: API_URL,
      headers: (): Record<string, string> =>
        token ? { Authorization: `Bearer ${token}` } : {},
    });
    return <T>(path: string, request?: Parameters<ApiFetcher>[1]) =>
      fetcher<T>(path, request).catch(reportEmailUnverified);
  }, [token]);
}
