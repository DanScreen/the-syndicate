/** A failed API call: HTTP status plus a readable message from the response body. */
export class ApiError extends Error {
  status: number;
  /** Machine-readable reason when the server sends one, e.g. `email_unverified`. */
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export type ApiRequest = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** JSON-serialised when present. */
  body?: unknown;
  signal?: AbortSignal;
};

/**
 * How the shared hooks talk to the API. Web uses same-origin cookies; mobile
 * prefixes EXPO_PUBLIC_API_URL and adds the Bearer token. Resolves with the
 * parsed JSON body, rejects with ApiError on a non-2xx response.
 */
export type ApiFetcher = <T>(path: string, request?: ApiRequest) => Promise<T>;

/** Turn an API `error` field (string or flattened Zod error) into one line. */
export function apiErrorMessage(error: unknown, fallback = "Request failed"): string {
  if (typeof error === "string" && error) return error;
  if (error && typeof error === "object") {
    const obj = error as Record<string, unknown>;
    if (Array.isArray(obj.formErrors)) {
      const messages = (obj.formErrors as string[]).join(", ");
      if (messages) return messages;
    }
    if (obj.fieldErrors && typeof obj.fieldErrors === "object") {
      const parts = Object.entries(obj.fieldErrors as Record<string, string[]>).flatMap(
        ([field, messages]) => messages.map((m) => `${field}: ${m}`)
      );
      if (parts.length) return parts.join("; ");
    }
  }
  return fallback;
}

/** `fetch` a JSON endpoint, throwing ApiError with the server's message on failure. */
export async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, init);
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiError(
      res.status,
      apiErrorMessage(data.error ?? data.message),
      typeof data.code === "string" ? data.code : undefined
    );
  }
  return data as T;
}

export function createApiFetcher({
  baseUrl = "",
  headers,
}: {
  baseUrl?: string;
  /** Extra headers per request, e.g. `Authorization`. */
  headers?: () => Record<string, string>;
} = {}): ApiFetcher {
  return <T>(path: string, { method = "GET", body, signal }: ApiRequest = {}) =>
    requestJson<T>(`${baseUrl}${path}`, {
      method,
      signal,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...headers?.(),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
}
