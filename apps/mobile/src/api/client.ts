import { API_URL } from "@/config";
import { ApiError, requestJson } from "@tiki-acca/client";

export { ApiError };

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
  return requestJson<T>(`${API_URL}${path}`, { ...init, headers });
}
