/** Allow only same-origin relative paths (incl. query) as post-auth redirects. */
export function safeCallbackUrl(
  raw: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!raw) return fallback;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  try {
    const parsed = new URL(raw);
    if (typeof window !== "undefined" && parsed.origin === window.location.origin) {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    /* ignore malformed URLs */
  }
  return fallback;
}

export function withCallbackUrl(href: string, callbackUrl: string): string {
  const url = new URL(href, "http://local.invalid");
  url.searchParams.set("callbackUrl", callbackUrl);
  return `${url.pathname}${url.search}`;
}
