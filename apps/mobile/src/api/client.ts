import { API_URL } from "@/config";
import { ApiError, requestJson } from "@tiki-acca/client";
import { EMAIL_UNVERIFIED_CODE } from "@tiki-acca/shared";

export { ApiError };

let onEmailUnverified: (() => void) | null = null;

/**
 * AuthProvider registers here so any API call rejected for an unverified email
 * (e.g. a user who was signed in before verification existed) flips the app
 * to the verify screen.
 */
export function setEmailUnverifiedListener(listener: (() => void) | null) {
  onEmailUnverified = listener;
}

/** `.catch` handler: flags an `email_unverified` 403 to the listener, then rethrows. */
export function reportEmailUnverified(err: unknown): never {
  if (err instanceof ApiError && err.status === 403 && err.code === EMAIL_UNVERIFIED_CODE) {
    onEmailUnverified?.();
  }
  throw err;
}

/** One-off API call with an optional Bearer token (`body` is a JSON string). */
export async function api<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, headers: initHeaders, ...init } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(initHeaders as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return requestJson<T>(`${API_URL}${path}`, { ...init, headers }).catch(reportEmailUnverified);
}
