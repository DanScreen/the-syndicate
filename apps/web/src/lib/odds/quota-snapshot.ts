import { getCached, setCached } from "./cache";
import { ODDS_QUOTA_SNAPSHOT_CACHE_KEY } from "./config";

export type OddsQuotaSnapshot = {
  requestsRemaining: string | null;
  requestsUsed: string | null;
  recordedAt: string;
};

const SNAPSHOT_TTL_MS = 86_400_000;

export function recordOddsApiQuota(headers: Headers) {
  const requestsRemaining = headers.get("x-requests-remaining");
  const requestsUsed = headers.get("x-requests-used");
  if (requestsRemaining == null && requestsUsed == null) return;

  setCached<OddsQuotaSnapshot>(
    ODDS_QUOTA_SNAPSHOT_CACHE_KEY,
    {
      requestsRemaining,
      requestsUsed,
      recordedAt: new Date().toISOString(),
    },
    SNAPSHOT_TTL_MS
  );
}

export function getOddsApiQuotaSnapshot(): OddsQuotaSnapshot | null {
  return getCached<OddsQuotaSnapshot>(ODDS_QUOTA_SNAPSHOT_CACHE_KEY);
}
