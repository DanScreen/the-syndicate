import { resolve4, resolve6, resolveMx } from "node:dns/promises";

const LOOKUP_TIMEOUT_MS = 3000;

/** DNS codes that mean "this name definitively has no such record". */
const MISSING = new Set(["ENOTFOUND", "ENODATA", "ENONAME"]);

type Lookup = "found" | "missing" | "unknown";

async function lookup(fn: () => Promise<unknown[]>): Promise<Lookup> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<Lookup>((resolve) => {
    timer = setTimeout(() => resolve("unknown"), LOOKUP_TIMEOUT_MS);
  });
  try {
    return await Promise.race([
      fn().then((records) => (records.length > 0 ? "found" : "missing")),
      timeout,
    ]);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code ?? "";
    return MISSING.has(code) ? "missing" : "unknown";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Whether `domain` can plausibly receive mail: an MX record, or failing that an
 * A/AAAA record (the RFC 5321 implicit-MX fallback). Catches gibberish like
 * `x@asdfgh.com` that passes format checks.
 *
 * Fails open — a DNS timeout or server error returns true — so a resolver
 * blip never blocks a real sign-up; the verification email is the real check.
 */
export async function emailDomainAcceptsMail(domain: string): Promise<boolean> {
  const mx = await lookup(() => resolveMx(domain));
  if (mx !== "missing") return true;

  const [a, aaaa] = await Promise.all([
    lookup(() => resolve4(domain)),
    lookup(() => resolve6(domain)),
  ]);
  return a !== "missing" || aaaa !== "missing";
}

export function emailDomain(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1);
}
