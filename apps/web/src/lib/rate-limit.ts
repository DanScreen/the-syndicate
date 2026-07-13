/**
 * In-memory fixed-window rate limiter.
 *
 * Per-instance: with `cloud_run_max_instances = 3` an attacker sees at most
 * 3× the configured limit — still orders of magnitude below what a
 * bcrypt-heavy flood needs. No external store required, which matters for
 * the GCP cost budget. Cloudflare's zone rate-limiting rule sits in front
 * of this as the first line of defence (see docs/DEPLOYMENT.md).
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Hard cap on tracked keys so a spoofed-IP flood cannot exhaust memory. */
const MAX_BUCKETS = 10_000;

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [k, v] of buckets) {
        if (v.resetAt <= now) buckets.delete(k);
      }
      // Still saturated after pruning: reset rather than grow unbounded.
      if (buckets.size >= MAX_BUCKETS) buckets.clear();
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  bucket.count += 1;
  return bucket.count > limit;
}

/** Seconds until the window resets — for Retry-After headers. */
export function retryAfterSeconds(key: string): number {
  const bucket = buckets.get(key);
  if (!bucket) return 60;
  return Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000));
}

/**
 * Client IP for rate-limit keys. Prefers Cloudflare's header (trustworthy
 * once the origin-auth check guarantees traffic came via Cloudflare), then
 * the first hop of x-forwarded-for (set by Cloud Run), else "unknown" —
 * which still throttles direct floods, just collectively.
 */
export function clientIpFrom(headers: Headers): string {
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}
