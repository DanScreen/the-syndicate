/** Client-safe route helpers shared by middleware and auth pages. */

export const SIGN_IN_PATH = "/sign-in";
export const VERIFY_EMAIL_PATH = "/verify-email";

/** Signed-in-only app routes. `/groups/join` stays public for invite links. */
export function isProtectedPath(path: string): boolean {
  return (
    path.startsWith("/dashboard") ||
    (path.startsWith("/groups") && path !== "/groups/join") ||
    path.startsWith("/admin") ||
    path.startsWith("/settings") ||
    path.startsWith("/account") ||
    path === "/performance"
  );
}

/** Where an unverified user is sent, returning to `returnTo` once confirmed. */
export function verifyEmailHref(returnTo: string): string {
  return `${VERIFY_EMAIL_PATH}?callbackUrl=${encodeURIComponent(returnTo)}`;
}

/** Where a signed-out visitor is sent, returning to `returnTo` after sign-in. */
export function signInHref(returnTo: string): string {
  return `${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent(returnTo)}`;
}
