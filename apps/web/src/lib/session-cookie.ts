/**
 * Auth.js session cookie names: `authjs.session-token`, `__Secure-` prefixed
 * over HTTPS, and `.0`, `.1`… suffixed when a large token is chunked.
 */
const SESSION_COOKIE = /^(__Secure-)?authjs\.session-token(\.\d+)?=/;

/**
 * Removes session-cookie Set-Cookie headers from a middleware response.
 *
 * Auth.js middleware re-encodes the token the request arrived with and sends
 * it back on every response. Edge can't read the DB, so that copy is never
 * refreshed — a request that left before the user verified their email can
 * land afterwards and put the unverified cookie back, and middleware then
 * bounces every protected page to /verify-email. Leaving the cookie to
 * /api/auth/session (which SessionProvider calls on every load and focus, and
 * whose jwt callback re-reads the DB) keeps it both rolling and current.
 */
export function withoutSessionCookie(response: Response): Response {
  const cookies = response.headers.getSetCookie();
  if (!cookies.some((cookie) => SESSION_COOKIE.test(cookie))) return response;

  response.headers.delete("set-cookie");
  for (const cookie of cookies) {
    if (!SESSION_COOKIE.test(cookie)) response.headers.append("set-cookie", cookie);
  }
  return response;
}
